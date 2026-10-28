use crate::{
    types::{DataKey, STORAGE_TTL_THRESHOLD},
    Config, PoolError, Stats, Student, TanongPool, TanongPoolClient,
};
use soroban_sdk::{
    testutils::{storage::Persistent as _, Address as _, Ledger, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal, InvokeError, Vec,
};

const ALLOWANCE: i128 = 2_500_000;
const PERIOD: u64 = 604_800;

struct Setup {
    env: Env,
    pool_id: Address,
    token: Address,
    admin: Address,
    sponsor: Address,
    student: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|ledger| ledger.timestamp = 1_000_000);
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let sponsor = Address::generate(&env);
    let student = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let pool_id = env.register(TanongPool, (&admin, &token, &ALLOWANCE, &PERIOD));
    Setup {
        env,
        pool_id,
        token,
        admin,
        sponsor,
        student,
    }
}

impl Setup {
    fn pool(&self) -> TanongPoolClient<'_> {
        TanongPoolClient::new(&self.env, &self.pool_id)
    }
}

fn mint(s: &Setup, account: &Address, amount: i128) {
    StellarAssetClient::new(&s.env, &s.token).mint(account, &amount);
}

fn fund(s: &Setup, amount: i128) {
    mint(s, &s.sponsor, amount);
    s.pool().fund(&s.sponsor, &amount);
}

fn is_contract_error<T, E>(
    result: Result<Result<T, E>, Result<soroban_sdk::Error, InvokeError>>,
    code: u32,
) -> bool {
    match result {
        Err(Ok(error)) => error.get_code() == code,
        Err(Err(InvokeError::Contract(found))) => found == code,
        _ => false,
    }
}

#[test]
fn fund_updates_stats_and_sponsor_totals() {
    let s = setup();
    fund(&s, 7_000_000);
    fund(&s, 3_000_000);
    assert_eq!(
        s.pool().stats(),
        Stats {
            total_funded: 10_000_000,
            total_claimed: 0,
            students: 0
        }
    );
    assert_eq!(s.pool().sponsor(&s.sponsor), 10_000_000);
    assert_eq!(
        TokenClient::new(&s.env, &s.token).balance(&s.pool_id),
        10_000_000
    );
}

#[test]
fn enroll_batch_and_unenroll_keep_student_count_consistent() {
    let s = setup();
    let second = Address::generate(&s.env);
    s.pool().enroll(&s.student);
    s.pool().enroll(&s.student);
    s.pool().enroll_batch(&Vec::from_array(
        &s.env,
        [s.student.clone(), second.clone()],
    ));
    assert_eq!(s.pool().stats().students, 2);
    assert!(s.pool().student(&s.student).enrolled);
    s.pool().unenroll(&s.student);
    s.pool().unenroll(&s.student);
    assert_eq!(s.pool().stats().students, 1);
    assert!(!s.pool().student(&s.student).enrolled);
}

#[test]
fn claim_rejects_second_claim_until_period_then_succeeds() {
    let s = setup();
    fund(&s, ALLOWANCE * 2);
    s.pool().enroll(&s.student);
    assert_eq!(s.pool().claim(&s.student), ALLOWANCE);
    assert_eq!(s.pool().next_claim_at(&s.student), 1_000_000 + PERIOD);
    assert!(is_contract_error(
        s.pool().try_claim(&s.student),
        PoolError::ClaimTooEarly as u32
    ));
    s.env
        .ledger()
        .with_mut(|ledger| ledger.timestamp = 1_000_000 + PERIOD);
    assert_eq!(s.pool().claim(&s.student), ALLOWANCE);
    assert_eq!(s.pool().next_claim_at(&s.student), 1_000_000 + 2 * PERIOD);
    assert_eq!(s.pool().stats().total_claimed, ALLOWANCE * 2);
    assert_eq!(s.pool().student(&s.student).total_claimed, ALLOWANCE * 2);
}

#[test]
fn claim_accepts_the_students_auth_entry_for_a_relayed_invocation() {
    let s = setup();
    fund(&s, ALLOWANCE);
    s.pool().enroll(&s.student);
    let claim_auth = MockAuthInvoke {
        contract: &s.pool_id,
        fn_name: "claim",
        args: (&s.student,).into_val(&s.env),
        sub_invokes: &[],
    };
    s.env.mock_auths(&[MockAuth {
        address: &s.student,
        invoke: &claim_auth,
    }]);
    assert_eq!(s.pool().claim(&s.student), ALLOWANCE);
}

#[test]
fn timestamp_zero_claim_still_starts_the_cooldown() {
    let s = setup();
    fund(&s, ALLOWANCE);
    s.pool().enroll(&s.student);
    s.env.ledger().with_mut(|ledger| ledger.timestamp = 0);
    assert_eq!(s.pool().claim(&s.student), ALLOWANCE);
    assert_eq!(s.pool().next_claim_at(&s.student), PERIOD);
    assert!(is_contract_error(
        s.pool().try_claim(&s.student),
        PoolError::ClaimTooEarly as u32
    ));
}

#[test]
fn not_enrolled_and_paused_claims_fail_but_funding_while_paused_works() {
    let s = setup();
    fund(&s, ALLOWANCE * 2);
    assert!(is_contract_error(
        s.pool().try_claim(&s.student),
        PoolError::NotEnrolled as u32
    ));
    s.pool().enroll(&s.student);
    s.pool().pause(&true);
    assert!(is_contract_error(
        s.pool().try_claim(&s.student),
        PoolError::Paused as u32
    ));
    fund(&s, ALLOWANCE);
    assert_eq!(s.pool().stats().total_funded, ALLOWANCE * 3);
    s.pool().pause(&false);
    assert_eq!(s.pool().claim(&s.student), ALLOWANCE);
}

#[test]
fn insufficient_pool_fails_without_claim_state_changes() {
    let s = setup();
    mint(&s, &s.sponsor, ALLOWANCE - 1);
    s.pool().fund(&s.sponsor, &(ALLOWANCE - 1));
    s.pool().enroll(&s.student);
    assert!(is_contract_error(
        s.pool().try_claim(&s.student),
        PoolError::PoolEmpty as u32
    ));
    assert_eq!(
        s.pool().student(&s.student),
        Student {
            enrolled: true,
            last_claim: 0,
            total_claimed: 0
        }
    );
    assert_eq!(s.pool().stats().total_claimed, 0);
}

#[test]
fn admin_only_calls_require_admin_authentication() {
    let s = setup();
    let outsider = Address::generate(&s.env);
    let student = Address::generate(&s.env);
    s.env.mock_auths(&[]);
    assert!(s.pool().try_enroll(&student).is_err());
    assert!(s
        .pool()
        .try_enroll_batch(&Vec::from_array(&s.env, [student.clone()]))
        .is_err());
    assert!(s.pool().try_unenroll(&student).is_err());
    assert!(s.pool().try_withdraw(&outsider, &1).is_err());
    assert!(s.pool().try_pause(&true).is_err());
    assert!(s.pool().try_set_allowance(&1, &1).is_err());
    assert!(s.pool().try_set_admin(&outsider).is_err());
    s.env.mock_all_auths();
}

#[test]
fn allowance_update_and_withdrawal_work() {
    let s = setup();
    fund(&s, 8_000_000);
    s.pool().set_allowance(&1_000_000, &3600);
    assert_eq!(
        s.pool().config(),
        Config {
            admin: s.admin.clone(),
            token: s.token.clone(),
            allowance: 1_000_000,
            period: 3600,
            paused: false,
        }
    );
    s.pool().enroll(&s.student);
    assert_eq!(s.pool().claim(&s.student), 1_000_000);
    let recipient = Address::generate(&s.env);
    s.pool().withdraw(&recipient, &2_000_000);
    assert_eq!(
        TokenClient::new(&s.env, &s.token).balance(&recipient),
        2_000_000
    );
    assert!(is_contract_error(
        s.pool().try_withdraw(&recipient, &0),
        PoolError::InvalidAmount as u32
    ));
}

#[test]
fn admin_rotation_moves_authority() {
    let s = setup();
    let next_admin = Address::generate(&s.env);
    s.pool().set_admin(&next_admin);
    assert_eq!(s.pool().config().admin, next_admin);
    s.env.mock_auths(&[]);
    assert!(s.pool().try_pause(&true).is_err());
    s.env.mock_all_auths();
    s.pool().pause(&true);
    assert!(s.pool().config().paused);
}

#[test]
fn invalid_amounts_and_period_are_rejected() {
    let s = setup();
    assert!(is_contract_error(
        s.pool().try_fund(&s.sponsor, &0),
        PoolError::InvalidAmount as u32
    ));
    assert!(is_contract_error(
        s.pool().try_fund(&s.sponsor, &-1),
        PoolError::InvalidAmount as u32
    ));
    assert!(is_contract_error(
        s.pool().try_set_allowance(&0, &PERIOD),
        PoolError::InvalidAmount as u32
    ));
    assert!(is_contract_error(
        s.pool().try_set_allowance(&1, &0),
        PoolError::InvalidPeriod as u32
    ));
}

#[test]
fn zero_balance_and_unenrolled_views_have_stable_defaults() {
    let s = setup();
    assert_eq!(s.pool().next_claim_at(&s.student), 0);
    assert_eq!(
        s.pool().student(&s.student),
        Student {
            enrolled: false,
            last_claim: 0,
            total_claimed: 0
        }
    );
    assert_eq!(s.pool().sponsor(&s.sponsor), 0);
}

#[test]
fn claim_bumps_persistent_student_ttl() {
    let s = setup();
    fund(&s, ALLOWANCE);
    s.pool().enroll(&s.student);
    let student_key = DataKey::Student(s.student.clone());
    let initial_ttl = s.env.as_contract(&s.pool_id, || {
        s.env.storage().persistent().get_ttl(&student_key)
    });
    let sequence_number = initial_ttl - STORAGE_TTL_THRESHOLD / 2;
    s.env
        .ledger()
        .with_mut(|ledger| ledger.sequence_number = sequence_number);
    let before = s.env.as_contract(&s.pool_id, || {
        s.env.storage().persistent().get_ttl(&student_key)
    });
    s.pool().claim(&s.student);
    let after = s.env.as_contract(&s.pool_id, || {
        s.env.storage().persistent().get_ttl(&student_key)
    });
    assert!(
        after > before,
        "TTL should be bumped, before={before}, after={after}"
    );
}
