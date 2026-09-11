use anchor_lang::prelude::*;
use crate::error::CustomError;
use serde_json::{Value};

#[account]
#[derive(Default)]
pub struct HeaderInfo {
    pub name: String,
    pub owner: Pubkey,
    pub owner_start:i64,
    pub owner_end:i64,
    pub sell_enabled:u8,
    pub sell_price:u64,
    pub user: Pubkey,
    pub user_start: i64,
    pub user_end: i64,
    pub rent_enabled:u8,
    pub rent_per_day:u64,
}

#[account]
pub struct AuthJsonConfig {
    pub authority: Pubkey,
    pub config_json: String,
}

pub struct ParsedTreasuryConfig {
    pub fee_receiver: Pubkey,
    pub cycle_fees: u64,
    pub protocol_fees: u64,
    pub name_closer: Pubkey,
}

pub fn parse_treasury_config(config_json: &str) -> Result<ParsedTreasuryConfig> {
    let config: Value = serde_json::from_str(config_json)
        .map_err(|e| {
            msg!("Failed to parse treasury config JSON: {}", e);
            CustomError::InvalidTreasuryConfig
        })?;

    let fee_receiver_str = config
        .get("fee_receiver")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            msg!("Missing or non-string fee_receiver field");
            CustomError::InvalidTreasuryConfig
        })?;

    let fee_receiver = Pubkey::try_from(fee_receiver_str)
        .map_err(|_| {
            msg!("Invalid Pubkey format: {}", fee_receiver_str);
            CustomError::InvalidTreasuryConfig
        })?;

    let cycle_fees = config
        .get("cycle_fees")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| {
            msg!("Missing or non-u64 cycle_fees field");
            CustomError::InvalidTreasuryConfig
        })?;

    let protocol_fees = config
        .get("protocol_fees")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| {
            msg!("Missing or non-u64 protocol_fees field");
            CustomError::InvalidTreasuryConfig
        })?;

    let name_closer_str = config
        .get("name_closer")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            msg!("Missing or non-string name_closer field");
            CustomError::InvalidTreasuryConfig
        })?;

    let name_closer = Pubkey::try_from(name_closer_str)
        .map_err(|_| {
            msg!("Invalid Pubkey format: {}", name_closer_str);
            CustomError::InvalidTreasuryConfig
        })?;

    Ok(ParsedTreasuryConfig {
        fee_receiver,
        cycle_fees,
        protocol_fees,
        name_closer,
    })
}

#[derive(Clone, Debug)]
pub struct ParsedMetaConfig {
    pub fee_receiver: Pubkey,
    pub cycle_fees: u64,
    pub pay_token: String,
}

pub fn parse_meta_config(config_json: &str) -> Result<ParsedMetaConfig> {
    let config: Value = serde_json::from_str(config_json)
        .map_err(|e| {
            msg!("Failed to parse treasury config JSON: {}", e);
            CustomError::InvalidTreasuryConfig
        })?;

    let fee_receiver_str = config
        .get("fee_receiver")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            msg!("Missing or non-string fee_receiver field");
            CustomError::InvalidTreasuryConfig
        })?;

    let fee_receiver = Pubkey::try_from(fee_receiver_str)
        .map_err(|_| {
            msg!("Invalid Pubkey format: {}", fee_receiver_str);
            CustomError::InvalidTreasuryConfig
        })?;

    let cycle_fees = config
        .get("cycle_fees")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| {
            msg!("Missing or non-u64 cycle_fees field");
            CustomError::InvalidTreasuryConfig
        })?;

    let pay_token_str = config
        .get("pay_token")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let pay_token = pay_token_str.to_string();

    Ok(ParsedMetaConfig {
        fee_receiver,
        cycle_fees,
        pay_token
    })
}