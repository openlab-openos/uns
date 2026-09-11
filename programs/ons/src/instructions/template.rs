use anchor_lang::prelude::*;
use crate::error::CustomError;
use crate::json_parser::SchemaValidator;
use serde_json::Value;
use crate::events::*;
use crate::instructions::common::AuthJsonConfig;

#[derive(Accounts)]
pub struct EcoTplInitialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 1024,
        seeds = [b"eco_tpl"],
        bump
    )]
    pub config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
impl EcoTplInitialize<'_> {
    pub fn handle(ctx: Context<Self>, config_json: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(config_json.len() <= 1024, CustomError::JsonTooLong);
        let parsed_config: Value = match serde_json::from_str(&config_json) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        config.authority = ctx.accounts.authority.key();
        config.config_json = config_json;
        emit!(ConfigUpdateEvent {
            name: "ecotpl".to_string(),
            kind: "EcoTplInitialize".to_string(),
            new_value: config.config_json.clone(),
            operator: ctx.accounts.authority.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct EcoTplUpdate<'info> {
    #[account(
        mut,
        seeds = [b"eco_tpl"],
        bump,
        constraint = config.authority == updater.key() @ CustomError::Unauthorized
    )]
    pub config: Account<'info, AuthJsonConfig>,

    #[account(signer)]
    pub updater: Signer<'info>, 
    pub system_program: Program<'info, System>,
}
impl EcoTplUpdate<'_> {
    pub fn handle(ctx: Context<Self>, config_json: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let parsed_config: Value = match serde_json::from_str(&config_json) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        config.config_json = config_json;
        emit!(ConfigUpdateEvent {
            name: "ecotpl".to_string(),
            kind: "EcoTplUpdate".to_string(),
            new_value: config.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct EntityTplInitialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 1024,
        seeds = [b"entity_tpl"],
        bump
    )]
    pub config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
impl EntityTplInitialize<'_> {
    pub fn handle(ctx: Context<Self>, config_json: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(config_json.len() <= 1024, CustomError::JsonTooLong);
        let parsed_config: Value = match serde_json::from_str(&config_json) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        config.authority = ctx.accounts.authority.key();
        config.config_json = config_json;
        emit!(ConfigUpdateEvent {
            name: "entitytpl".to_string(),
            kind: "EntityTplInitialize".to_string(),
            new_value: config.config_json.clone(),
            operator: ctx.accounts.authority.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct EntityTplUpdate<'info> {
    #[account(
        mut,
        seeds = [b"entity_tpl"],
        bump,
        constraint = config.authority == updater.key() @ CustomError::Unauthorized
    )]
    pub config: Account<'info, AuthJsonConfig>,

    #[account(signer)]
    pub updater: Signer<'info>, 
    pub system_program: Program<'info, System>,
}
impl EntityTplUpdate<'_> {
    pub fn handle(ctx: Context<Self>, config_json: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let parsed_config: Value = match serde_json::from_str(&config_json) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        config.config_json = config_json;
        emit!(ConfigUpdateEvent {
            name: "entitytpl".to_string(),
            kind: "EntityTplUpdate".to_string(),
            new_value: config.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}