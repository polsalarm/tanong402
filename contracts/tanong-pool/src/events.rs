use soroban_sdk::{contractevent, Address};

#[contractevent(topics = ["funded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Funded {
    pub sponsor: Address,
    pub amount: i128,
}

#[contractevent(topics = ["enrolled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Enrolled {
    pub student: Address,
}

#[contractevent(topics = ["unenrolled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Unenrolled {
    pub student: Address,
}

#[contractevent(topics = ["claimed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claimed {
    pub student: Address,
    pub amount: i128,
    pub at: u64,
}

#[contractevent(topics = ["withdrawn"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Withdrawn {
    pub to: Address,
    pub amount: i128,
}

#[contractevent(topics = ["paused"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Paused {
    pub paused: bool,
}

#[contractevent(topics = ["config"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigUpdated {
    pub allowance: i128,
    pub period: u64,
}
