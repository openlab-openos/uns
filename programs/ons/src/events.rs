use anchor_lang::prelude::*;

#[event]
pub struct ConfigUpdateEvent {
    #[index] pub name: String,
    pub kind: String,
    pub new_value: String,
    pub operator: Pubkey,
}

#[event]
pub struct NameCreateEvent {
    #[index] pub name: String,
    pub kind: String,
    pub operator: Pubkey,
    pub start: i64,
    pub end: i64,
}

#[event]
pub struct AskEvent{
    #[index] pub name: String,
    pub kind: String,
    pub enabled: u8,
    pub price: u64,
    pub operator: Pubkey,
}

#[event]
pub struct BidEvent {
    #[index] pub name: String,
    pub kind: String,
    pub operator: Pubkey,
    pub start: i64,
    pub end: i64,
    pub fees: u64,
}

#[event]
pub struct RenewEvent {
    #[index] pub name: String,
    pub kind: String,
    pub start: i64,
    pub end: i64,
    pub operator: Pubkey,
    pub duration: u32,
}

#[event]
pub struct TransferEvent {
    #[index] pub name: String,
    pub kind: String,
    pub new_owner: Pubkey,
    pub operator: Pubkey,
}
