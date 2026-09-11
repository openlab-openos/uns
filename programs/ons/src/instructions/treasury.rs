use anchor_lang::prelude::*;
use crate::error::CustomError;
use crate::json_parser::SchemaValidator;
use serde_json::Value;
use crate::events::*;
use crate::instructions::common::AuthJsonConfig;

const TREASURY_SCHEMA: &str = r#"
{
    "cycle_fees": "uint",
    "protocol_fees": "uint",
    "fee_receiver": "string(44)",
    "name_closer": "string(44)"
}
"#;
pub fn get_treasury_schema() -> Value {
    serde_json::from_str(TREASURY_SCHEMA).unwrap()
}

#[derive(Accounts)]
pub struct TreasuryInitialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 1024,
        seeds = [b"treasury_config"],
        bump
    )]
    pub config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
impl TreasuryInitialize<'_> {
    pub fn handle(ctx: Context<Self>, config_json: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(config_json.len() <= 1024, CustomError::JsonTooLong);
        let parsed_config = match serde_json::from_str(&config_json) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        let schema = get_treasury_schema();
        match SchemaValidator::validate(&parsed_config, &schema) {
            Ok(_) => {                
            }
            Err(e) => {
                msg!("Schema format error: {}", e);
                return Err(CustomError::InvalidTreasuryConfig.into());
            }
        }
        config.authority = ctx.accounts.authority.key();
        config.config_json = config_json;
        emit!(ConfigUpdateEvent {
            name: "treasury".to_string(),
            kind: "TreasuryInitialize".to_string(),
            new_value: config.config_json.clone(),
            operator: ctx.accounts.authority.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct TreasuryUpdate<'info> {
    #[account(
        mut,
        seeds = [b"treasury_config"],
        bump,
        constraint = config.authority == updater.key() @ CustomError::Unauthorized
    )]
    pub config: Account<'info, AuthJsonConfig>,

    #[account(signer)]
    pub updater: Signer<'info>, 
    pub system_program: Program<'info, System>,
}
impl TreasuryUpdate<'_> {
    pub fn handle(ctx: Context<Self>, config_json: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let parsed_config = match serde_json::from_str(&config_json) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        let schema = get_treasury_schema();
        match SchemaValidator::validate(&parsed_config, &schema) {
            Ok(_) => {                
            }
            Err(e) => {
                msg!("Schema format error: {}", e);
                return Err(CustomError::InvalidTreasuryConfig.into());
            }
        }
        config.config_json = config_json;
        emit!(ConfigUpdateEvent {
            name: "treasury".to_string(),
            kind: "TreasuryUpdate".to_string(),
            new_value: config.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}
