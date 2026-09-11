use anchor_lang::prelude::*;
use crate::error::CustomError;
use crate::events::*;
use crate::instructions::common::{HeaderInfo, AuthJsonConfig, parse_treasury_config, parse_meta_config};
use anchor_lang::system_program::{self, transfer, Transfer};
use anchor_lang::solana_program::hash::hash;
use anchor_spl::token_interface::{TokenAccount, Mint, TokenInterface, transfer_checked, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;
use serde_json::Value;
use crate::json_parser::SchemaValidator;

fn require_valid_eco_name(label: &str) -> Result<()> {
    if label.is_empty() {
        return err!(CustomError::NameEmpty);
    }

    if label.starts_with('-'){
        return err!(CustomError::InvalidCharacter);
    }
    if label.ends_with('-'){
        return err!(CustomError::InvalidCharacter);
    }

    for ch in label.chars() {
        if !ch.is_ascii() 
            || !(ch.is_ascii_alphanumeric() || ch == '-') 
        {
            return err!(CustomError::InvalidCharacter);
        }
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoCreate<'info> {
    #[account(
        init_if_needed,
        payer = operator,
        space = 8 + 4 + 100 + 32 + 8 + 8 + 1 + 8 + 32 + 8 + 8 + 1 + 8,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        init_if_needed,
        payer = operator,
        space = 8 + 32 + 4 + 4096,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(
        init_if_needed,
        payer = operator,
        space = 8 + 32 + 4 + 4096,
        seeds = [b"body", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub body: Account<'info, AuthJsonConfig>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub treasury: Account<'info, AuthJsonConfig>,
    #[account(
        seeds = [b"eco_tpl"],
        bump
    )]
    pub eco_tpl: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>, 
}

impl EcoCreate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, meta: String, body: String, years: u8) -> Result<()> {
        let treasury_act = &mut ctx.accounts.treasury;
        let ecotpl_act = &mut ctx.accounts.eco_tpl;
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let body_act = &mut ctx.accounts.body;

        let name_len = name.len();
        require_valid_eco_name(&name)?;
        require!(name_len <= 100, CustomError::NameTooLong);
        require!(years >= 1, CustomError::YearsTooSmall);

        let current_timestamp = Clock::get()?.unix_timestamp;
        if header_act.owner_start < current_timestamp && current_timestamp < header_act.owner_end {
            return Err(CustomError::NameInUse.into());
        }

        let parsed_config = match serde_json::from_str(&meta) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        let schema = serde_json::from_str(&ecotpl_act.config_json).unwrap();
        match SchemaValidator::validate(&parsed_config, &schema) {
            Ok(_) => {                
            }
            Err(e) => {
                msg!("Schema format error: {}", e);
                return Err(CustomError::InvalidMetaConfig.into());
            }
        }

        header_act.name = name.clone();
        header_act.owner = ctx.accounts.operator.key();
        header_act.owner_start = current_timestamp;
        header_act.owner_end = header_act.owner_start + (years as i64 * 365 * 24 * 60 * 60);
        header_act.sell_enabled = 0;
        header_act.sell_price = 0;
        header_act.user = system_program::ID;
        header_act.user_start = 0;
        header_act.user_end = 0;
        header_act.rent_enabled = 0;
        header_act.rent_per_day = 0;

        meta_act.authority = ctx.accounts.operator.key();
        meta_act.config_json = meta;

        body_act.authority = ctx.accounts.operator.key();
        body_act.config_json = body;

        let treasury_config = parse_treasury_config(&treasury_act.config_json)?;
        require!(
            ctx.accounts.fee_receiver.key() == treasury_config.fee_receiver,
            CustomError::FeeReceiverMismatch
        );

        let base_fee = treasury_config.cycle_fees;       
        let total_fee = (years as u64) * base_fee;    
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.operator.to_account_info(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, total_fee)?; 
        msg!("Eco created:{} years:{} fees:{}", header_act.name, years, total_fee);
        
        emit!(NameCreateEvent {
            name: header_act.name.clone(),
            kind: "Eco".to_string(),
            operator: header_act.owner,
            start: header_act.owner_start,
            end: header_act.owner_end,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct NameClose<'info> {
    #[account(
        mut,
        close = operator,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        close = operator,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(
        mut,
        close = operator,
        seeds = [b"body", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub body: Account<'info, AuthJsonConfig>,

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub treasury: Account<'info, AuthJsonConfig>,

    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl NameClose<'_> {
    pub fn handle(ctx: Context<Self>, name: String) -> Result<()> {
        let header_act = &ctx.accounts.header;
        let treasury_act = &mut ctx.accounts.treasury;
        let current_time = Clock::get()?.unix_timestamp;

        let treasury_config = parse_treasury_config(&treasury_act.config_json)?;
        require!(
            ctx.accounts.operator.key() == treasury_config.name_closer,
            CustomError::NameCloserMismatch
        );
        require!(current_time >= header_act.owner_end, CustomError::NameNotExpired);
        msg!("{} has been closed and funds reclaimed.", name);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoMetaUpdate<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub meta: Account<'info, AuthJsonConfig>,
    #[account(
        seeds = [b"eco_tpl"],
        bump
    )]
    pub eco_tpl: Account<'info, AuthJsonConfig>,

    #[account(
        signer,
        constraint = updater.key() == meta.authority @ CustomError::Unauthorized
    )]
    pub updater: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl EcoMetaUpdate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, meta: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let ecotpl_act = &mut ctx.accounts.eco_tpl;
        let meta_act = &mut ctx.accounts.meta;
        require_valid_eco_name(&name)?;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        
        let parsed_config = match serde_json::from_str(&meta) {
            Ok(val) => val,
            Err(e) => {
                msg!("Failed to parse config JSON: {}", e);
                return Err(CustomError::InvalidJsonFormat.into());
            }
        };
        let schema = serde_json::from_str(&ecotpl_act.config_json).unwrap();
        match SchemaValidator::validate(&parsed_config, &schema) {
            Ok(_) => {                
            }
            Err(e) => {
                msg!("Schema format error: {}", e);
                return Err(CustomError::InvalidMetaConfig.into());
            }
        }

        meta_act.config_json = meta;
        msg!("Update meta : {}", name);
        emit!(ConfigUpdateEvent {
            name,
            kind: "EcoMeta".to_string(),
            new_value: meta_act.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoBodyUpdate<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"body", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub body: Account<'info, AuthJsonConfig>,

    #[account(
        signer,
        constraint = updater.key() == body.authority @ CustomError::Unauthorized
    )]
    pub updater: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl EcoBodyUpdate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, body: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;   
        let body_act = &mut ctx.accounts.body;
        require_valid_eco_name(&name)?;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        body_act.config_json = body;
        msg!("Update body : {}", name);
        emit!(ConfigUpdateEvent {
            name,
            kind: "EcoBody".to_string(),
            new_value: body_act.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoSaleAsk<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
        constraint = header.owner == operator.key()
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,

    system_program: Program<'info, System>,
}

impl EcoSaleAsk<'_> {
    pub fn handle(ctx: Context<Self>, name: String, enabled: u8, sell_price: u64) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        require_valid_eco_name(&name)?;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        require!(enabled <= 1, CustomError::InvalidEnabled);
        
        header_act.sell_enabled = enabled;
        header_act.sell_price = sell_price;

        msg!("EcoSaleAsk name:{} enabled:{} sell_price:{}", name, enabled, sell_price);
        emit!(AskEvent {            
            name: header_act.name.clone(),
            kind: "EcoSale".to_string(),
            enabled,
            price: sell_price,
            operator: ctx.accounts.operator.key(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoSaleBid<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(
        mut,
        seeds = [b"body", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub body: Account<'info, AuthJsonConfig>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,

    system_program: Program<'info, System>,
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>,     
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(mut)]
    pub from_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub to_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Option<InterfaceAccount<'info, Mint>>,
}

pub fn eco_sale_bid_payment(
    ctx: &Context<EcoSaleBid>, 
    pay_token: &str, 
    fees: u64
) -> Result<()> {
    if pay_token.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.operator.to_account_info(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, fees)?;
    } else {
        require!(ctx.accounts.from_token_account.is_some(), CustomError::InvalidTokenAccount);
        require!(ctx.accounts.to_token_account.is_some(), CustomError::InvalidTokenAccount);
        require!(ctx.accounts.mint.is_some(), CustomError::InvalidTokenMint);
        let from_token_account = ctx.accounts.from_token_account.as_ref().unwrap();
        let to_token_account = ctx.accounts.to_token_account.as_ref().unwrap();
        let mint = ctx.accounts.mint.as_ref().unwrap();
        let token_mint_pubkey = Pubkey::try_from(pay_token)
            .map_err(|_| error!(CustomError::InvalidTokenMint))?;
        require!(
            token_mint_pubkey == mint.key(),
            CustomError::MintMismatchPayToken
        );    
        require!(
            from_token_account.mint == token_mint_pubkey,
            CustomError::MintMismatch
        );
        require!(
            from_token_account.owner == ctx.accounts.operator.key(),
            CustomError::TokenAccountOwnerMismatch
        );
        require!(
            to_token_account.mint == token_mint_pubkey,
            CustomError::MintMismatch
        );
        require!(
            to_token_account.owner == ctx.accounts.fee_receiver.key(),
            CustomError::TokenAccountOwnerMismatch
        );
 
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_token_account.to_account_info(),
                    mint: mint.to_account_info(),
                    to: to_token_account.to_account_info(),
                    authority: ctx.accounts.operator.to_account_info(),
                },
            ),
            fees,
            mint.decimals
        )?;
    }
    Ok(())
}

impl EcoSaleBid<'_> {
    pub fn handle(ctx: Context<Self>, name: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let body_act = &mut ctx.accounts.body;
        require_valid_eco_name(&name)?;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(header_act.sell_enabled == 1, CustomError::SaleDisabled);
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        
        let fees= header_act.sell_price;
        let meta_config = parse_meta_config(&meta_act.config_json)?;
        require!(
            ctx.accounts.fee_receiver.key() == meta_config.fee_receiver,
            CustomError::FeeReceiverMismatch
        );
        let operator_key = ctx.accounts.operator.key();
        header_act.owner = operator_key;
        header_act.sell_enabled = 0;
        meta_act.authority = operator_key;
        body_act.authority = operator_key;       

        msg!("EcoSaleBid:{} fees:{}", name, fees);
        emit!(BidEvent {
            name: name,
            kind: "EcoSale".to_string(),
            operator: operator_key,
            start: header_act.owner_start,
            end: header_act.owner_end,
            fees: fees,
        });

        eco_sale_bid_payment(&ctx, &meta_config.pay_token, fees)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoOwnerRenew<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
        constraint = header.owner == operator.key()  @ CustomError::Unauthorized
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(signer)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub treasury: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>, 
}

impl EcoOwnerRenew<'_> {
    pub fn handle(ctx: Context<Self>, name: String, years: u8) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let treasury_act = &mut ctx.accounts.treasury;
        require_valid_eco_name(&name)?;
        let name_len = name.len();
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        require!(
            ctx.accounts.operator.key() == header_act.owner,
            CustomError::Unauthorized
        );        
        require!(years >= 1, CustomError::YearsTooSmall);

        header_act.owner_end = std::cmp::max(header_act.owner_end, clock.unix_timestamp) + (years as i64 * 365 * 24 * 60 * 60);

        let treasury_config = parse_treasury_config(&treasury_act.config_json)?;
        require!(
            ctx.accounts.fee_receiver.key() == treasury_config.fee_receiver,
            CustomError::FeeReceiverMismatch
        );

        let base_fee = treasury_config.cycle_fees;        
        let total_fee = (years as u64) * base_fee;   
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.operator.to_account_info(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, total_fee)?;
        msg!("Renewing owner name:{} years:{} fees:{}", name, years, total_fee);

        emit!(RenewEvent {
            name: header_act.name.clone(),
            kind: "EcoOwner".to_string(),
            start: header_act.owner_start,
            end: header_act.owner_end,
            operator: ctx.accounts.operator.key(),
            duration: years as u32,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoOwnerTransfer<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(
        mut,
        seeds = [b"body", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub body: Account<'info, AuthJsonConfig>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,
    pub new_owner: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
impl EcoOwnerTransfer<'_> {
    pub fn handle(ctx: Context<Self>, name: String, new_owner: Pubkey) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let body_act = &mut ctx.accounts.body;
        require_valid_eco_name(&name)?;
        require!(ctx.accounts.operator.key() == header_act.owner, CustomError::OwnerMismatch);
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        header_act.owner = new_owner;
        meta_act.authority = new_owner;
        body_act.authority = new_owner;
        msg!("Transfer owner name:{} newOwner:{}", name, new_owner.to_string());
        emit!(TransferEvent {
            name: header_act.name.clone(),
            kind: "EcoOwner".to_string(),
            new_owner: new_owner,
            operator: ctx.accounts.operator.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoRentAsk<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
        constraint = header.owner == operator.key()
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,

    system_program: Program<'info, System>,
}

impl EcoRentAsk<'_> {
    pub fn handle(ctx: Context<Self>, name: String, enabled: u8, rent_per_day: u64) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        require_valid_eco_name(&name)?;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        require!(enabled <= 1, CustomError::InvalidEnabled);
        
        header_act.rent_enabled = enabled;
        header_act.rent_per_day = rent_per_day;

        msg!("EcoRentAsk name:{} enabled:{} rent_per_day:{}", name, enabled, rent_per_day);
        emit!(AskEvent {            
            name: header_act.name.clone(),
            kind: "EcoRent".to_string(),
            enabled,
            price: rent_per_day,
            operator: ctx.accounts.operator.key(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoRentBid<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(
        init_if_needed,
        payer = operator,
        space = 8 + 32 + 4 + 4096,
        seeds = [b"rent", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub rent_info: Account<'info, AuthJsonConfig>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,

    system_program: Program<'info, System>,
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>, 
    #[account(mut)]
    pub from_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub to_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Option<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn eco_rent_bid_payment(
    ctx: &Context<EcoRentBid>, 
    pay_token: &str, 
    fees: u64
) -> Result<()> {
    if pay_token.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.operator.to_account_info(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, fees)?;
    } else {
        require!(ctx.accounts.from_token_account.is_some(), CustomError::InvalidTokenAccount);
        require!(ctx.accounts.to_token_account.is_some(), CustomError::InvalidTokenAccount);
        require!(ctx.accounts.mint.is_some(), CustomError::InvalidTokenMint);
        let from_token_account = ctx.accounts.from_token_account.as_ref().unwrap();
        let to_token_account = ctx.accounts.to_token_account.as_ref().unwrap();
        let mint = ctx.accounts.mint.as_ref().unwrap();
        let token_mint_pubkey = Pubkey::try_from(pay_token)
            .map_err(|_| error!(CustomError::InvalidTokenMint))?;
        require!(
            token_mint_pubkey == mint.key(),
            CustomError::MintMismatchPayToken
        );    
        require!(
            from_token_account.mint == token_mint_pubkey,
            CustomError::MintMismatch
        );
        require!(
            from_token_account.owner == ctx.accounts.operator.key(),
            CustomError::TokenAccountOwnerMismatch
        );
        require!(
            to_token_account.mint == token_mint_pubkey,
            CustomError::MintMismatch
        );
        require!(
            to_token_account.owner == ctx.accounts.fee_receiver.key(),
            CustomError::TokenAccountOwnerMismatch
        );
 
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_token_account.to_account_info(),
                    mint: mint.to_account_info(),
                    to: to_token_account.to_account_info(),
                    authority: ctx.accounts.operator.to_account_info(),
                },
            ),
            fees,
            mint.decimals
        )?;
    }
    Ok(())
}

impl EcoRentBid<'_> {
    pub fn handle(ctx: Context<Self>, name: String, days: u32) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let rent_info_act = &mut ctx.accounts.rent_info;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require_valid_eco_name(&name)?;
        require!(header_act.rent_enabled == 1, CustomError::RentDisabled);
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        require!(header_act.user_end == 0 || header_act.user_end < current_timestamp, CustomError::AlreadyLeased);
        require!(days >= 1, CustomError::DaysTooSmall);
        
        let duration = days as i64 * 24 * 60 * 60;
        let end_timestamp = current_timestamp + duration;
        require!(end_timestamp <= header_act.owner_end, CustomError::RentTooLong);

        let fees= header_act.rent_per_day * days as u64;
        let meta_config = parse_meta_config(&meta_act.config_json)?;
        require!(
            ctx.accounts.fee_receiver.key() == meta_config.fee_receiver,
            CustomError::FeeReceiverMismatch
        );
        header_act.user = ctx.accounts.operator.key();
        header_act.user_start = current_timestamp;
        header_act.user_end = end_timestamp;
        let operator_key = ctx.accounts.operator.key();

        rent_info_act.authority = operator_key;
        rent_info_act.config_json = "".to_string();

        eco_rent_bid_payment(&ctx, &meta_config.pay_token, fees)?;       

        msg!("EcoRentBid:{} days:{} fees:{}", name, days, fees);
        emit!(BidEvent {
            name: name,
            kind: "EcoRent".to_string(),
            operator: operator_key,
            start: current_timestamp,
            end: end_timestamp,
            fees: fees,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoRentInfoUpdate<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"rent", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub rent_info: Account<'info, AuthJsonConfig>,

    #[account(mut, signer,
        constraint = updater.key() == rent_info.authority @ CustomError::Unauthorized
    )]
    pub updater: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl EcoRentInfoUpdate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, info: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let info_act = &mut ctx.accounts.rent_info;
        require_valid_eco_name(&name)?;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        
        info_act.config_json = info;
        msg!("EcoRentInfoUpdate:{}", name);
        emit!(ConfigUpdateEvent {
            name: name,
            kind: "EcoRentInfo".to_string(),
            new_value: info_act.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoRentRenew<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
        constraint = header.user == operator.key()  @ CustomError::Unauthorized
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(signer)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        mut,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>, 
    #[account(mut)]
    pub from_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub to_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Option<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn eco_rent_renew_payment(
    ctx: &Context<EcoRentRenew>, 
    pay_token: &str, 
    fees: u64
) -> Result<()> {
    if pay_token.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.operator.to_account_info(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, fees)?;
    } else {
        require!(ctx.accounts.from_token_account.is_some(), CustomError::InvalidTokenAccount);
        require!(ctx.accounts.to_token_account.is_some(), CustomError::InvalidTokenAccount);
        require!(ctx.accounts.mint.is_some(), CustomError::InvalidTokenMint);
        let from_token_account = ctx.accounts.from_token_account.as_ref().unwrap();
        let to_token_account = ctx.accounts.to_token_account.as_ref().unwrap();
        let mint = ctx.accounts.mint.as_ref().unwrap();
        let token_mint_pubkey = Pubkey::try_from(pay_token)
            .map_err(|_| error!(CustomError::InvalidTokenMint))?;
        require!(
            token_mint_pubkey == mint.key(),
            CustomError::MintMismatchPayToken
        );    
        require!(
            from_token_account.mint == token_mint_pubkey,
            CustomError::MintMismatch
        );
        require!(
            from_token_account.owner == ctx.accounts.operator.key(),
            CustomError::TokenAccountOwnerMismatch
        );
        require!(
            to_token_account.mint == token_mint_pubkey,
            CustomError::MintMismatch
        );
        require!(
            to_token_account.owner == ctx.accounts.fee_receiver.key(),
            CustomError::TokenAccountOwnerMismatch
        );
 
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_token_account.to_account_info(),
                    mint: mint.to_account_info(),
                    to: to_token_account.to_account_info(),
                    authority: ctx.accounts.operator.to_account_info(),
                },
            ),
            fees,
            mint.decimals
        )?;
    }
    Ok(())
}

impl EcoRentRenew<'_> {
    pub fn handle(ctx: Context<Self>, name: String, days: u32) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require_valid_eco_name(&name)?;
        require!(
            current_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        require!(
            current_timestamp < header_act.user_end,
            CustomError::RentExpired
        );
        require!(
            ctx.accounts.operator.key() == header_act.user,
            CustomError::Unauthorized
        );
        require!(header_act.rent_enabled == 1, CustomError::RentDisabled); 
        require!(days >= 1, CustomError::DaysTooSmall);

        header_act.user_end = std::cmp::max(header_act.user_end, current_timestamp) + (days as i64 * 24 * 60 * 60);

        let meta_config = parse_meta_config(&meta_act.config_json)?;
        require!(
            ctx.accounts.fee_receiver.key() == meta_config.fee_receiver,
            CustomError::FeeReceiverMismatch
        );

        let fees= header_act.rent_per_day * days as u64;
        emit!(RenewEvent {
            name: header_act.name.clone(),
            kind: "EcoRent".to_string(),
            start: header_act.user_start,
            end: header_act.user_end,
            operator: ctx.accounts.operator.key(),
            duration: days,
        });
        eco_rent_renew_payment(&ctx, &meta_config.pay_token, fees)?;          
        msg!("Renewing rent name:{} days:{} fees:{}", name, days, fees);       

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EcoRentTransfer<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"rent", &hash(name.as_bytes()).to_bytes()[..16]],
        bump
    )]
    pub rent_info: Account<'info, AuthJsonConfig>,

    #[account(mut, signer)]
    pub operator: Signer<'info>,
    pub new_owner: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
impl EcoRentTransfer<'_> {
    pub fn handle(ctx: Context<Self>, name: String, new_owner: Pubkey) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let info_act = &mut ctx.accounts.rent_info;
        require_valid_eco_name(&name)?;
        require!(ctx.accounts.operator.key() == header_act.user, CustomError::RenterMismatch);
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        require!(
            clock.unix_timestamp < header_act.user_end,
            CustomError::RentExpired
        );
        header_act.user = new_owner;
        info_act.authority = new_owner;
        msg!("Transfer rent name:{} newOwner:{}", name, new_owner.to_string());
        emit!(TransferEvent {
            name: header_act.name.clone(),
            kind: "EcoRent".to_string(),
            new_owner: new_owner,
            operator: ctx.accounts.operator.key(),
        });

        Ok(())
    }
}