#![no_std]

mod events;
mod types;

use events::{Claimed, ConfigUpdated, Enrolled, Funded, Paused, Unenrolled, Withdrawn};
use soroban_sdk::{contract, contractimpl, panic_with_error, token, Address, Env, Vec};
pub use types::{Config, PoolError, Stats, Student};
use types::{DataKey, STORAGE_TTL_THRESHOLD};

#[contract]
pub struct TanongPool;

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, STORAGE_TTL_THRESHOLD, env.storage().max_ttl());
}

fn config_from(env: &Env) -> Config {
    Config {
        admin: env.storage().instance().get(&DataKey::Admin).unwrap(),
        token: env.storage().instance().get(&DataKey::Token).unwrap(),
        allowance: env.storage().instance().get(&DataKey::Allowance).unwrap(),
        period: env.storage().instance().get(&DataKey::Period).unwrap(),
        paused: env.storage().instance().get(&DataKey::Paused).unwrap(),
    }
}

fn stats_from(env: &Env) -> Stats {
    env.storage().instance().get(&DataKey::Stats).unwrap()
}

fn get_student(env: &Env, address: &Address) -> Student {
    env.storage()
        .persistent()
        .get(&DataKey::Student(address.clone()))
        .unwrap_or(Student {
            enrolled: false,
            last_claim: 0,
            total_claimed: 0,
        })
}

fn checked_add(a: i128, b: i128) -> Result<i128, PoolError> {
    a.checked_add(b).ok_or(PoolError::ArithmeticOverflow)
}

fn checked_time_add(a: u64, b: u64) -> Result<u64, PoolError> {
    a.checked_add(b).ok_or(PoolError::ArithmeticOverflow)
}

fn require_admin(env: &Env) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    admin.require_auth();
}

#[contractimpl]
impl TanongPool {
    pub fn __constructor(env: Env, admin: Address, token: Address, allowance: i128, period: u64) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, PoolError::AlreadyInitialized);
        }
        if allowance <= 0 {
            panic_with_error!(&env, PoolError::InvalidAmount);
        }
        if period == 0 {
            panic_with_error!(&env, PoolError::InvalidPeriod);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::Allowance, &allowance);
        env.storage().instance().set(&DataKey::Period, &period);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(
            &DataKey::Stats,
            &Stats {
                total_funded: 0,
                total_claimed: 0,
                students: 0,
            },
        );
    }

    pub fn fund(env: Env, from: Address, amount: i128) {
        if amount <= 0 {
            panic_with_error!(&env, PoolError::InvalidAmount);
        }
        from.require_auth();
        let cfg = config_from(&env);
        token::Client::new(&env, &cfg.token).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        let mut stats = stats_from(&env);
        stats.total_funded =
            checked_add(stats.total_funded, amount).unwrap_or_else(|e| panic_with_error!(&env, e));
        env.storage().instance().set(&DataKey::Stats, &stats);
        let key = DataKey::Sponsor(from.clone());
        let old: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let total = checked_add(old, amount).unwrap_or_else(|e| panic_with_error!(&env, e));
        env.storage().persistent().set(&key, &total);
        bump_persistent(&env, &key);
        Funded {
            sponsor: from,
            amount,
        }
        .publish(&env);
    }

    pub fn enroll(env: Env, student: Address) {
        require_admin(&env);
        Self::enroll_one(&env, &student);
    }

    pub fn enroll_batch(env: Env, students: Vec<Address>) {
        require_admin(&env);
        for student in students.iter() {
            Self::enroll_one(&env, &student);
        }
    }

    fn enroll_one(env: &Env, student: &Address) {
        let key = DataKey::Student(student.clone());
        let mut record = get_student(env, student);
        if !record.enrolled {
            record.enrolled = true;
            let mut stats = stats_from(env);
            stats.students = stats
                .students
                .checked_add(1)
                .unwrap_or_else(|| panic_with_error!(env, PoolError::ArithmeticOverflow));
            env.storage().instance().set(&DataKey::Stats, &stats);
        }
        env.storage().persistent().set(&key, &record);
        bump_persistent(env, &key);
        Enrolled {
            student: student.clone(),
        }
        .publish(env);
    }

    pub fn unenroll(env: Env, student: Address) {
        require_admin(&env);
        let key = DataKey::Student(student.clone());
        let mut record = get_student(&env, &student);
        if record.enrolled {
            record.enrolled = false;
            let mut stats = stats_from(&env);
            stats.students = stats
                .students
                .checked_sub(1)
                .unwrap_or_else(|| panic_with_error!(&env, PoolError::ArithmeticOverflow));
            env.storage().instance().set(&DataKey::Stats, &stats);
        }
        env.storage().persistent().set(&key, &record);
        bump_persistent(&env, &key);
        Unenrolled { student }.publish(&env);
    }

    pub fn claim(env: Env, student: Address) -> i128 {
        student.require_auth();
        let cfg = config_from(&env);
        if cfg.paused {
            panic_with_error!(&env, PoolError::Paused);
        }
        let key = DataKey::Student(student.clone());
        let mut record = get_student(&env, &student);
        if !record.enrolled {
            panic_with_error!(&env, PoolError::NotEnrolled);
        }
        let now = env.ledger().timestamp();
        // total_claimed distinguishes a real first claim at ledger timestamp 0
        // from a never-claimed student while preserving the specified record shape.
        if record.total_claimed > 0 {
            let next = checked_time_add(record.last_claim, cfg.period)
                .unwrap_or_else(|e| panic_with_error!(&env, e));
            if now < next {
                panic_with_error!(&env, PoolError::ClaimTooEarly);
            }
        }
        let token = token::Client::new(&env, &cfg.token);
        if token.balance(&env.current_contract_address()) < cfg.allowance {
            panic_with_error!(&env, PoolError::PoolEmpty);
        }
        token.transfer(&env.current_contract_address(), &student, &cfg.allowance);
        record.last_claim = now;
        record.total_claimed = checked_add(record.total_claimed, cfg.allowance)
            .unwrap_or_else(|e| panic_with_error!(&env, e));
        env.storage().persistent().set(&key, &record);
        bump_persistent(&env, &key);
        let mut stats = stats_from(&env);
        stats.total_claimed = checked_add(stats.total_claimed, cfg.allowance)
            .unwrap_or_else(|e| panic_with_error!(&env, e));
        env.storage().instance().set(&DataKey::Stats, &stats);
        Claimed {
            student,
            amount: cfg.allowance,
            at: now,
        }
        .publish(&env);
        cfg.allowance
    }

    pub fn set_allowance(env: Env, amount: i128, period: u64) {
        require_admin(&env);
        if amount <= 0 {
            panic_with_error!(&env, PoolError::InvalidAmount);
        }
        if period == 0 {
            panic_with_error!(&env, PoolError::InvalidPeriod);
        }
        env.storage().instance().set(&DataKey::Allowance, &amount);
        env.storage().instance().set(&DataKey::Period, &period);
        ConfigUpdated {
            allowance: amount,
            period,
        }
        .publish(&env);
    }

    pub fn pause(env: Env, paused: bool) {
        require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &paused);
        Paused { paused }.publish(&env);
    }

    pub fn withdraw(env: Env, to: Address, amount: i128) {
        require_admin(&env);
        if amount <= 0 {
            panic_with_error!(&env, PoolError::InvalidAmount);
        }
        let cfg = config_from(&env);
        let token = token::Client::new(&env, &cfg.token);
        if token.balance(&env.current_contract_address()) < amount {
            panic_with_error!(&env, PoolError::PoolEmpty);
        }
        token.transfer(&env.current_contract_address(), &to, &amount);
        Withdrawn { to, amount }.publish(&env);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        require_admin(&env);
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn config(env: Env) -> Config {
        config_from(&env)
    }

    pub fn stats(env: Env) -> Stats {
        stats_from(&env)
    }

    pub fn student(env: Env, address: Address) -> Student {
        get_student(&env, &address)
    }

    pub fn next_claim_at(env: Env, address: Address) -> u64 {
        let record = get_student(&env, &address);
        if !record.enrolled || record.total_claimed == 0 {
            0
        } else {
            let period: u64 = env.storage().instance().get(&DataKey::Period).unwrap();
            checked_time_add(record.last_claim, period)
                .unwrap_or_else(|e| panic_with_error!(&env, e))
        }
    }

    pub fn sponsor(env: Env, address: Address) -> i128 {
        let key = DataKey::Sponsor(address);
        env.storage().persistent().get(&key).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
