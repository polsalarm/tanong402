use soroban_sdk::{contracterror, contracttype, Address};

pub const STORAGE_TTL_THRESHOLD: u32 = 17_280;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub token: Address,
    pub allowance: i128,
    pub period: u64,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stats {
    pub total_funded: i128,
    pub total_claimed: i128,
    pub students: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Student {
    pub enrolled: bool,
    pub last_claim: u64,
    pub total_claimed: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Allowance,
    Period,
    Paused,
    Stats,
    Student(Address),
    Sponsor(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PoolError {
    AlreadyInitialized = 1,
    InvalidAmount = 2,
    InvalidPeriod = 3,
    NotEnrolled = 4,
    ClaimTooEarly = 5,
    Paused = 6,
    PoolEmpty = 7,
    ArithmeticOverflow = 8,
}
