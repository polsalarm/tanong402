# Tanong Scholarship Pool

Soroban contract for a USDC scholarship pool. Amounts use the USDC SAC's 7 decimal places (for example, `2_500_000` is $0.25). The constructor receives the admin address, USDC Stellar Asset Contract address, fixed claim allowance, and claim period in seconds.

## Interface

| Function | Authorization | Result / behavior |
| --- | --- | --- |
| `__constructor(admin, token, allowance, period)` | — | Initializes the pool; allowance and period must be positive. |
| `fund(from, amount)` | `from` | Transfers USDC into the pool and tracks sponsor and aggregate funding. Available while paused. |
| `enroll(student)` | Admin | Enables claims for one student. Re-enrolling does not inflate the active-student count. |
| `enroll_batch(students)` | Admin | Enables claims for each supplied address. |
| `unenroll(student)` | Admin | Disables future claims; existing claim history remains. |
| `claim(student) -> i128` | `student` | Pays the configured allowance when enrolled, unpaused, past the cooldown, and sufficiently funded. The student auth requirement is independent of transaction source, allowing a relayer to submit a student-authorized invocation. |
| `pause(paused)` | Admin | Enables or disables claims. |
| `set_allowance(amount, period)` | Admin | Updates both positive claim settings. |
| `withdraw(to, amount)` | Admin | Transfers available USDC out of the pool. |
| `set_admin(new_admin)` | Admin | Rotates admin authority. |
| `config()` | — | Returns admin, token, allowance, period, and paused state. |
| `stats()` | — | Returns total funded, total claimed, and currently enrolled student count. |
| `student(address)` | — | Returns enrollment and claim history; unknown addresses return a zeroed, unenrolled record. |
| `next_claim_at(address)` | — | Returns zero before a student's first claim (or when unenrolled), otherwise `last_claim + period`. |
| `sponsor(address)` | — | Returns total amount funded by the address, or zero. |

## Errors

| Code | Name | Meaning |
| ---: | --- | --- |
| 1 | `AlreadyInitialized` | Constructor initialization already exists. |
| 2 | `InvalidAmount` | Amount must be positive. |
| 3 | `InvalidPeriod` | Claim period must be positive. |
| 4 | `NotEnrolled` | Student is not enrolled. |
| 5 | `ClaimTooEarly` | Student has not reached the next claim time. |
| 6 | `Paused` | Claims are paused. |
| 7 | `PoolEmpty` | Pool balance is below the requested payment or withdrawal. |
| 8 | `ArithmeticOverflow` | A checked counter or time calculation overflowed. |

Soroban authorization failures are enforced by `require_auth` and reported by the host authorization system.

## Events

The event topic is the lowercase event name. Payloads are typed contract values:

| Topic | Fields |
| --- | --- |
| `funded` | `sponsor`, `amount` |
| `enrolled` | `student` |
| `unenrolled` | `student` |
| `claimed` | `student`, `amount`, `at` |
| `withdrawn` | `to`, `amount` |
| `paused` | `paused` |
| `config` | `allowance`, `period` |

Persistent sponsor and student records get a TTL extension whenever written. Instance storage holds configuration and aggregate stats. An unenrolled student's history is retained, while the stats student count tracks active enrollments.

## Build and test

The compatible pinned toolchain used for this implementation is Soroban SDK `28.0.0` and Stellar CLI `28.1.0`. SDK 29 requires Stellar CLI 29 or newer, which was not available in the current CLI release when this was implemented.

```sh
cd contracts
cargo test
stellar contract build
```

Build output is `contracts/target/wasm32v1-none/release/tanong_pool.wasm`.

## Deploy and operate

Install `stellar` and configure network identities first. The deploy helper expects `POOL_ADMIN` and `USDC_SAC` addresses, plus optional `ALLOWANCE` (default `2500000`) and `PERIOD` (default `604800`). `POOL_ADMIN` may be an address or configured identity; deployment transaction source is selected with `--source` using `SOURCE_IDENTITY` (default `tanong-admin`).

```sh
POOL_ADMIN=G... USDC_SAC=CA... scripts/contracts/deploy.sh testnet
POOL_CONTRACT_ID=C... scripts/contracts/init-pool.sh testnet
POOL_CONTRACT_ID=C... SOURCE_IDENTITY=sponsor scripts/contracts/fund-pool.sh testnet 10000000
```

The scripts do not print secret keys and pass identity names through `--source`.

Current testnet deployment: contract `CAVZVSTO55EMWLAQGG45B6HFOUPGB4LLIDX3HMW3BCG2QHR3FDMF7SCD`, administered by public key `GCDSY2PZ5F6N2SWNITKZ6SPYQISNQWPQKK2QL6O3KOREGWGZLS6JGZWQ`.
