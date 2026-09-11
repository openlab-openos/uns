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
use std::io::{Cursor, Read};
use spl_token_2022::{
    state::{Account as Account2022, Mint as Mint2022},
    extension::StateWithExtensions,
};

pub fn require_valid_entity_name(label: &str) -> Result<()> {
    if label.is_empty() {
        return err!(CustomError::NameEmpty);
    }
    if label.starts_with('-') {
        return err!(CustomError::InvalidCharacter);
    }
    if label.ends_with('-') {
        return err!(CustomError::InvalidCharacter);
    }
    for ch in label.chars() {
        if !ch.is_ascii() || !(ch.is_ascii_alphanumeric() || ch == '-') {
            return err!(CustomError::InvalidCharacter);
        }
    }
    Ok(())
}

pub fn require_valid_full_name(full_name: &str) -> Result<()> {
    const PROTOCOL_SEPARATOR: &str = "://";
    if !full_name.contains(PROTOCOL_SEPARATOR) {
        return err!(CustomError::MissingEcoSeparator);
    }

    let separator_index = full_name
        .find(PROTOCOL_SEPARATOR)
        .ok_or(CustomError::MissingEcoSeparator)?;
    let entity_part = &full_name[separator_index + PROTOCOL_SEPARATOR.len()..];

    if entity_part.is_empty() {
        return err!(CustomError::NameEmpty);
    }

    for label in entity_part.split('.') {
        require_valid_entity_name(label)?; 
    }

    Ok(())
}

pub fn parse_enity_full_name(uri: &str) -> Result<Vec<String>> {
    const PROTOCOL_SEPARATOR: &str = "://";
    
    let separator_index = uri.find(PROTOCOL_SEPARATOR)
        .ok_or(CustomError::MissingEcoSeparator)?;
    
    let protocol = &uri[..separator_index];
    if protocol.is_empty() {
        return err!(CustomError::InvalidEntityName); 
    }

    let host_part_start = separator_index + PROTOCOL_SEPARATOR.len();
    let host_part = &uri[host_part_start..];
    if host_part.is_empty() {
        return err!(CustomError::InvalidEntityName);
    }
    for label in host_part.split('.') {
        require_valid_entity_name(label)?;
    }
    if host_part.is_empty() || host_part.starts_with('.') || host_part.ends_with('.') {
        return err!(CustomError::InvalidEntityName);
    }
    let parts: Vec<&str> = host_part.split('.').collect();
    if parts.is_empty() || parts.iter().any(|p| p.is_empty()) {
        return err!(CustomError::InvalidEntityName);
    }
    let mut parent_names = Vec::new();
    let total_parts = parts.len();
    if total_parts > 4 {
        return err!(CustomError::MaxEntityLevelIsFour);
    }    
    parent_names.push(protocol.to_string());
    for i in (1..total_parts).rev() {
        let parent_name = parts[i..].join(".");
        let full_parent_name = format!("{}://{}", protocol, parent_name);
        parent_names.push(full_parent_name);
    }
    parent_names.push(parts[0].to_string());
    Ok(parent_names)
}

pub fn parse_enity_all_names(uri: &str) -> Result<Vec<String>> {
    const PROTOCOL_SEPARATOR: &str = "://";
    
    let separator_index = uri.find(PROTOCOL_SEPARATOR)
        .ok_or(CustomError::MissingEcoSeparator)?;
    
    let protocol = &uri[..separator_index];
    if protocol.is_empty() {
        return err!(CustomError::InvalidEntityName); 
    }

    let host_part_start = separator_index + PROTOCOL_SEPARATOR.len();
    let host_part = &uri[host_part_start..];
    if host_part.is_empty() {
        return err!(CustomError::InvalidEntityName);
    }
    for label in host_part.split('.') {
        require_valid_entity_name(label)?;
    }
    if host_part.is_empty() || host_part.starts_with('.') || host_part.ends_with('.') {
        return err!(CustomError::InvalidEntityName);
    }
    let parts: Vec<&str> = host_part.split('.').collect();
    if parts.is_empty() || parts.iter().any(|p| p.is_empty()) {
        return err!(CustomError::InvalidEntityName);
    }
    let mut parent_names = Vec::new();
    let total_parts = parts.len();
    if total_parts > 4 {
        return err!(CustomError::MaxEntityLevelIsFour);
    }    
    parent_names.push(protocol.to_string());
    for i in (0..total_parts).rev() {
        let parent_name = parts[i..].join(".");
        let full_parent_name = format!("{}://{}", protocol, parent_name);
        parent_names.push(full_parent_name);
    }
    Ok(parent_names)
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityCreate<'info> {
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
    #[account(
        seeds = [b"entity_tpl"],
        bump
    )]
    pub entity_tpl: Account<'info, AuthJsonConfig>,
   
    #[account(mut,signer)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,    

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub protocol_config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub parent_fee_receiver: SystemAccount<'info>,
    #[account(mut)]
    pub protocol_fee_receiver: SystemAccount<'info>,
}

pub fn entity_create_payment(
    ctx: &Context<EntityCreate>, 
    parent_names: &[String],
    years: u8
) -> Result<()> {    
    let protocol_config_act = &ctx.accounts.protocol_config;
    let eco_meta_info = &ctx.remaining_accounts[0];
    let parent_meta_info = &ctx.remaining_accounts[1];

    let parent_count = parent_names.len();
    let from_account: AccountInfo<'_> = ctx.accounts.operator.to_account_info();     
    let parent_name = parent_names[parent_count - 2].clone();
    let eco_name = parent_names[0].clone();
    let (parent_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(parent_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    let (eco_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(eco_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    require!(parent_meta_info.key() == parent_meta_key, CustomError::InvalidMetaPda);
    require!(eco_meta_info.key() == eco_meta_key, CustomError::InvalidMetaPda);
    let protocol_config = parse_treasury_config(&protocol_config_act.config_json)?;
    require!(
        ctx.accounts.protocol_fee_receiver.key() == protocol_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );

    let mut parent_meta_data: &[u8] = &parent_meta_info.data.borrow();
    let parent_meta_config_account = AuthJsonConfig::try_deserialize(&mut parent_meta_data)?;
    let parent_meta_config = parse_meta_config(&parent_meta_config_account.config_json)?;        
    require!(
        ctx.accounts.parent_fee_receiver.key() == parent_meta_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );  

    let mut eco_meta_data: &[u8] = &eco_meta_info.data.borrow();
    let eco_meta_config_account = AuthJsonConfig::try_deserialize(&mut eco_meta_data)?;
    let eco_meta_config = parse_meta_config(&eco_meta_config_account.config_json)?;
    let pay_token_str = eco_meta_config.pay_token.clone();
    let entity_fee = parent_meta_config.cycle_fees;
    let entity_fees = (years as u64) * entity_fee;
    if pay_token_str.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: from_account.clone(), 
                to: ctx.accounts.parent_fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, entity_fees)?;        
    } else {
        let ata_to = &ctx.remaining_accounts[2];
        let ata_from = &ctx.remaining_accounts[3];
        let ata_authority = &ctx.remaining_accounts[4];            
        let ata_mint = &ctx.remaining_accounts[5];
        let ata_program = &ctx.remaining_accounts[6];
        let mut decimals = 9;
        {
            let token_mint_pubkey = Pubkey::try_from(pay_token_str.as_str())
                .map_err(|_| error!(CustomError::InvalidTokenMint))?;
            require!(
                token_mint_pubkey == ata_mint.key(),
                CustomError::MintMismatchPayToken
            );
            let ata_from_data = ata_from.data.borrow();
            let from_account_state = StateWithExtensions::<Account2022>::unpack(&ata_from_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let from_token_account = &from_account_state.base;
            let ata_to_data = ata_to.data.borrow();
            let to_account_state = StateWithExtensions::<Account2022>::unpack(&ata_to_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let to_token_account = &to_account_state.base;
            let ata_mint_data = ata_mint.data.borrow();
            let mint_state = StateWithExtensions::<Mint2022>::unpack(&ata_mint_data)?;
            let mint_account = &mint_state.base;
            decimals = mint_account.decimals;
            require!(
                from_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                from_token_account.owner == ata_authority.key(),
                CustomError::TokenAccountOwnerMismatch
            );
            require!(
                to_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                to_token_account.owner == ctx.accounts.parent_fee_receiver.key(),
                CustomError::InvalidFeeReceiver
            );
        }
        transfer_checked(
            CpiContext::new(
                ata_program.to_account_info(),
                TransferChecked {
                    from: ata_from.to_account_info(),
                    mint: ata_mint.to_account_info(),
                    to: ata_to.to_account_info(),
                    authority: ata_authority.to_account_info(),
                },
            ),
            entity_fees,
            decimals,
        )?;
    }
    let cpi_context2 = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: from_account.clone(), 
            to: ctx.accounts.protocol_fee_receiver.to_account_info(),
        },
    );
    transfer(cpi_context2, protocol_config.protocol_fees)?;
    Ok(())
}

impl EntityCreate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, meta: String, body: String, years: u8) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let body_act = &mut ctx.accounts.body;
        let entitytpl_act = &mut ctx.accounts.entity_tpl;

        let name_len = name.len();
        require_valid_full_name(&name)?;
        require!(name_len <= 100, CustomError::NameTooLong);
        require!(years >= 1, CustomError::YearsTooSmall);

        let parents_names = parse_enity_full_name(&name)?;
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
        let schema = serde_json::from_str(&entitytpl_act.config_json).unwrap();
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
        
        msg!("Entity created:{} years:{}", header_act.name, years);
        emit!(NameCreateEvent {
            name: header_act.name.clone(),
            kind: "Entity".to_string(),
            operator: header_act.owner,
            start: header_act.owner_start,
            end: header_act.owner_end,
        });        
        entity_create_payment(&ctx, &parents_names, years)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityMetaUpdate<'info> {
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
        seeds = [b"entity_tpl"],
        bump
    )]
    pub entity_tpl: Account<'info, AuthJsonConfig>,

    #[account(
        signer,
        constraint = updater.key() == meta.authority @ CustomError::Unauthorized
    )]
    pub updater: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl EntityMetaUpdate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, meta: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let entitytpl_act = &mut ctx.accounts.entity_tpl;
        require_valid_full_name(&name)?;
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
        let schema = serde_json::from_str(&entitytpl_act.config_json).unwrap();
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
            kind: "EntityMeta".to_string(),
            new_value: meta_act.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityBodyUpdate<'info> {
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

impl EntityBodyUpdate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, body: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;   
        let body_act = &mut ctx.accounts.body;
        require_valid_full_name(&name)?;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        body_act.config_json = body;
        msg!("Update body : {}", name);
        emit!(ConfigUpdateEvent {
            name: name,
            kind: "EntityBody".to_string(),
            new_value: body_act.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntitySaleAsk<'info> {
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

impl EntitySaleAsk<'_> {
    pub fn handle(ctx: Context<Self>, name: String, enabled: u8, sell_price: u64) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require_valid_full_name(&name)?;
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        require!(enabled <= 1, CustomError::InvalidEnabled);
        
        header_act.sell_enabled = enabled;
        header_act.sell_price = sell_price;

        msg!("EntitySaleAsk name:{} enabled:{} sell_price:{}", name, enabled, sell_price);
        emit!(AskEvent {            
            name: header_act.name.clone(),
            kind: "EntitySale".to_string(),
            enabled,
            price: sell_price,
            operator: ctx.accounts.operator.key(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntitySaleBid<'info> {
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

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub protocol_config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub protocol_fee_receiver: SystemAccount<'info>,  
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>, 
}

pub fn entity_sale_bid_payment(
    ctx: &Context<EntitySaleBid>, 
    parent_names: &[String],
    fees: u64
) -> Result<()> {
    let meta_act = &ctx.accounts.meta;

    let protocol_config_act = &ctx.accounts.protocol_config;
    let eco_meta_info = &ctx.remaining_accounts[0];

    let parent_count = parent_names.len();
    let from_account: AccountInfo<'_> = ctx.accounts.operator.to_account_info();     
    let eco_name = parent_names[0].clone();
    let (eco_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(eco_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    require!(eco_meta_info.key() == eco_meta_key, CustomError::InvalidMetaPda);
    let protocol_config = parse_treasury_config(&protocol_config_act.config_json)?;
    require!(
        ctx.accounts.protocol_fee_receiver.key() == protocol_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );
    let meta_config = parse_meta_config(&meta_act.config_json)?;
    require!(
        ctx.accounts.fee_receiver.key() == meta_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );

    let mut eco_meta_data: &[u8] = &eco_meta_info.data.borrow();
    let eco_meta_config_account = AuthJsonConfig::try_deserialize(&mut eco_meta_data)?;
    let eco_meta_config = parse_meta_config(&eco_meta_config_account.config_json)?;
    let pay_token_str = eco_meta_config.pay_token.clone();

    if pay_token_str.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: from_account.clone(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, fees)?;
    } else {
        let ata_to = &ctx.remaining_accounts[1];
        let ata_from = &ctx.remaining_accounts[2];
        let ata_authority = &ctx.remaining_accounts[3];            
        let ata_mint = &ctx.remaining_accounts[4];
        let ata_program = &ctx.remaining_accounts[5];
        let mut decimals = 9;
        {
            let token_mint_pubkey = Pubkey::try_from(pay_token_str.as_str())
                .map_err(|_| error!(CustomError::InvalidTokenMint))?;
            require!(
                token_mint_pubkey == ata_mint.key(),
                CustomError::MintMismatchPayToken
            );
            let ata_from_data = ata_from.data.borrow();
            let from_account_state = StateWithExtensions::<Account2022>::unpack(&ata_from_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let from_token_account = &from_account_state.base;
            let ata_to_data = ata_to.data.borrow();
            let to_account_state = StateWithExtensions::<Account2022>::unpack(&ata_to_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let to_token_account = &to_account_state.base;
            let ata_mint_data = ata_mint.data.borrow();
            let mint_state = StateWithExtensions::<Mint2022>::unpack(&ata_mint_data)?;
            let mint_account = &mint_state.base;
            decimals = mint_account.decimals;
            require!(
                from_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                from_token_account.owner == ata_authority.key(),
                CustomError::TokenAccountOwnerMismatch
            );
            require!(
                to_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                to_token_account.owner == ctx.accounts.fee_receiver.key(),
                CustomError::InvalidFeeReceiver
            );
        }
        transfer_checked(
            CpiContext::new(
                ata_program.to_account_info(),
                TransferChecked {
                    from: ata_from.to_account_info(),
                    mint: ata_mint.to_account_info(),
                    to: ata_to.to_account_info(),
                    authority: ata_authority.to_account_info(),
                },
            ),
            fees,
            decimals,
        )?;
    }
    let cpi_context2 = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: from_account.clone(), 
            to: ctx.accounts.protocol_fee_receiver.to_account_info(),
        },
    );
    transfer(cpi_context2, protocol_config.protocol_fees)?;
    Ok(())
}

impl EntitySaleBid<'_> {
    pub fn handle(ctx: Context<Self>, name: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let body_act = &mut ctx.accounts.body;
        require_valid_full_name(&name)?;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(header_act.sell_enabled == 1, CustomError::SaleDisabled);
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        let parents_names = parse_enity_all_names(&name)?;        
        let fees= header_act.sell_price;        

        let operator_key = ctx.accounts.operator.key();
        header_act.owner = operator_key;
        header_act.sell_enabled = 0;
        meta_act.authority = operator_key;
        body_act.authority = operator_key;

        msg!("EntitySaleBid:{} fees:{}", name, fees);
        emit!(BidEvent {
            name: name,
            kind: "EntitySale".to_string(),
            operator: operator_key,
            start: header_act.owner_start,
            end: header_act.owner_end,
            fees: fees,
        });

        entity_sale_bid_payment(&ctx, &parents_names, fees)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityOwnerRenew<'info> {
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
    pub protocol_config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub parent_fee_receiver: SystemAccount<'info>,
    #[account(mut)]
    pub protocol_fee_receiver: SystemAccount<'info>,
}

pub fn entity_renew_payment(
    ctx: &Context<EntityOwnerRenew>, 
    parent_names: &[String],
    years: u8
) -> Result<()> {
    let protocol_config_act = &ctx.accounts.protocol_config;
    let eco_meta_info = &ctx.remaining_accounts[0];
    let parent_meta_info = &ctx.remaining_accounts[1];

    let parent_count = parent_names.len();
    let parent_name = parent_names[parent_count - 2].clone();
    let eco_name = parent_names[0].clone();
    let from_account = ctx.accounts.operator.to_account_info(); 
    let (parent_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(parent_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    let (eco_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(eco_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    require!(parent_meta_info.key() == parent_meta_key, CustomError::InvalidMetaPda);
    require!(eco_meta_info.key() == eco_meta_key, CustomError::InvalidMetaPda);
    let protocol_config = parse_treasury_config(&protocol_config_act.config_json)?;
    require!(
        ctx.accounts.protocol_fee_receiver.key() == protocol_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );

    let mut parent_meta_data: &[u8] = &parent_meta_info.data.borrow();
    let parent_meta_config_account = AuthJsonConfig::try_deserialize(&mut parent_meta_data)?;
    let parent_meta_config = parse_meta_config(&parent_meta_config_account.config_json)?;        
    require!(
        ctx.accounts.parent_fee_receiver.key() == parent_meta_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );  

    let mut eco_meta_data: &[u8] = &eco_meta_info.data.borrow();
    let eco_meta_config_account = AuthJsonConfig::try_deserialize(&mut eco_meta_data)?;
    let eco_meta_config = parse_meta_config(&eco_meta_config_account.config_json)?;
    let pay_token_str = eco_meta_config.pay_token.clone();

    let entity_fee = parent_meta_config.cycle_fees;
    let entity_fees = (years as u64) * entity_fee;
    if pay_token_str.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: from_account.clone(), 
                to: ctx.accounts.parent_fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, entity_fees)?;
    } else {
        let ata_to = &ctx.remaining_accounts[2];
        let ata_from = &ctx.remaining_accounts[3];
        let ata_authority = &ctx.remaining_accounts[4];            
        let ata_mint = &ctx.remaining_accounts[5];
        let ata_program = &ctx.remaining_accounts[6];
        let mut decimals = 9;
        {
            let token_mint_pubkey = Pubkey::try_from(pay_token_str.as_str())
                .map_err(|_| error!(CustomError::InvalidTokenMint))?;
            require!(
                token_mint_pubkey == ata_mint.key(),
                CustomError::MintMismatchPayToken
            );
            let ata_from_data = ata_from.data.borrow();
            let from_account_state = StateWithExtensions::<Account2022>::unpack(&ata_from_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let from_token_account = &from_account_state.base;
            let ata_to_data = ata_to.data.borrow();
            let to_account_state = StateWithExtensions::<Account2022>::unpack(&ata_to_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let to_token_account = &to_account_state.base;
            let ata_mint_data = ata_mint.data.borrow();
            let mint_state = StateWithExtensions::<Mint2022>::unpack(&ata_mint_data)?;
            let mint_account = &mint_state.base;
            decimals = mint_account.decimals;
            require!(
                from_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                from_token_account.owner == ata_authority.key(),
                CustomError::TokenAccountOwnerMismatch
            );
            require!(
                to_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                to_token_account.owner == ctx.accounts.parent_fee_receiver.key(),
                CustomError::InvalidFeeReceiver
            );
        }
        transfer_checked(
            CpiContext::new(
                ata_program.to_account_info(),
                TransferChecked {
                    from: ata_from.to_account_info(),
                    mint: ata_mint.to_account_info(),
                    to: ata_to.to_account_info(),
                    authority: ata_authority.to_account_info(),
                },
            ),
            entity_fees,
            decimals,
        )?;
    }
    let cpi_context2 = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: from_account.clone(), 
            to: ctx.accounts.protocol_fee_receiver.to_account_info(),
        },
    );
    transfer(cpi_context2, protocol_config.protocol_fees)?;
    Ok(())
}

impl EntityOwnerRenew<'_> {
    pub fn handle(ctx: Context<Self>, name: String, years: u8) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        require_valid_full_name(&name)?;
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
        let parents_names = parse_enity_full_name(&name)?;

        header_act.owner_end = std::cmp::max(header_act.owner_end, clock.unix_timestamp) + (years as i64 * 365 * 24 * 60 * 60);
        msg!("Renewing owner name:{} years:{}", name, years);
        emit!(RenewEvent {
            name: header_act.name.clone(),
            kind: "EntityOwner".to_string(),
            start: header_act.owner_start,
            end: header_act.owner_end,
            operator: ctx.accounts.operator.key(),
            duration: years as u32,
        });
        entity_renew_payment(&ctx, &parents_names, years)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityOwnerTransfer<'info> {
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
impl EntityOwnerTransfer<'_> {
    pub fn handle(ctx: Context<Self>, name: String, new_owner: Pubkey) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let meta_act = &mut ctx.accounts.meta;
        let body_act = &mut ctx.accounts.body;
        require_valid_full_name(&name)?;
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
            kind: "EntityOwner".to_string(),
            new_owner: new_owner,
            operator: ctx.accounts.operator.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityRentAsk<'info> {
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

impl EntityRentAsk<'_> {
    pub fn handle(ctx: Context<Self>, name: String, enabled: u8, rent_per_day: u64) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require_valid_full_name(&name)?;
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        require!(enabled <= 1, CustomError::InvalidEnabled);
        
        header_act.rent_enabled = enabled;
        header_act.rent_per_day = rent_per_day;

        msg!("EntityRentAsk name:{} enabled:{} rent_per_day:{}", name, enabled, rent_per_day);
        emit!(AskEvent {            
            name: header_act.name.clone(),
            kind: "EntityRent".to_string(),
            enabled,
            price: rent_per_day,
            operator: ctx.accounts.operator.key(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityRentBid<'info> {
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

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub protocol_config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>,
    #[account(mut)]
    pub protocol_fee_receiver: SystemAccount<'info>,
}

pub fn entity_rent_bid_payment(
    ctx: &Context<EntityRentBid>, 
    parent_names: &[String],
    fees: u64
) -> Result<()> {
    let meta_act = &ctx.accounts.meta;
    let protocol_config_act = &ctx.accounts.protocol_config;
    let eco_meta_info = &ctx.remaining_accounts[0];

    let parent_count = parent_names.len();
    let from_account: AccountInfo<'_> = ctx.accounts.operator.to_account_info();     
    let eco_name = parent_names[0].clone();
    let (eco_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(eco_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    require!(eco_meta_info.key() == eco_meta_key, CustomError::InvalidMetaPda);
    let protocol_config = parse_treasury_config(&protocol_config_act.config_json)?;
    require!(
        ctx.accounts.protocol_fee_receiver.key() == protocol_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );

    let meta_config = parse_meta_config(&meta_act.config_json)?;
    require!(
        ctx.accounts.fee_receiver.key() == meta_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    ); 

    let mut eco_meta_data: &[u8] = &eco_meta_info.data.borrow();
    let eco_meta_config_account = AuthJsonConfig::try_deserialize(&mut eco_meta_data)?;
    let eco_meta_config = parse_meta_config(&eco_meta_config_account.config_json)?;
    let pay_token_str = eco_meta_config.pay_token.clone();

    if pay_token_str.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: from_account.clone(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, fees)?;
    } else {
        let ata_to = &ctx.remaining_accounts[1];
        let ata_from = &ctx.remaining_accounts[2];
        let ata_authority = &ctx.remaining_accounts[3];            
        let ata_mint = &ctx.remaining_accounts[4];
        let ata_program = &ctx.remaining_accounts[5];
        let mut decimals = 9;
        {
            let token_mint_pubkey = Pubkey::try_from(pay_token_str.as_str())
                .map_err(|_| error!(CustomError::InvalidTokenMint))?;
            require!(
                token_mint_pubkey == ata_mint.key(),
                CustomError::MintMismatchPayToken
            );
            let ata_from_data = ata_from.data.borrow();
            let from_account_state = StateWithExtensions::<Account2022>::unpack(&ata_from_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let from_token_account = &from_account_state.base;
            let ata_to_data = ata_to.data.borrow();
            let to_account_state = StateWithExtensions::<Account2022>::unpack(&ata_to_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let to_token_account = &to_account_state.base;
            let ata_mint_data = ata_mint.data.borrow();
            let mint_state = StateWithExtensions::<Mint2022>::unpack(&ata_mint_data)?;
            let mint_account = &mint_state.base;
            decimals = mint_account.decimals;
            require!(
                from_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                from_token_account.owner == ata_authority.key(),
                CustomError::TokenAccountOwnerMismatch
            );
            require!(
                to_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                to_token_account.owner == ctx.accounts.fee_receiver.key(),
                CustomError::InvalidFeeReceiver
            );
        }
        transfer_checked(
            CpiContext::new(
                ata_program.to_account_info(),
                TransferChecked {
                    from: ata_from.to_account_info(),
                    mint: ata_mint.to_account_info(),
                    to: ata_to.to_account_info(),
                    authority: ata_authority.to_account_info(),
                },
            ),
            fees,
            decimals,
        )?;
    }
    let cpi_context2 = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: from_account.clone(), 
            to: ctx.accounts.protocol_fee_receiver.to_account_info(),
        },
    );
    transfer(cpi_context2, protocol_config.protocol_fees)?;

    Ok(())
}

impl EntityRentBid<'_> {
    pub fn handle(ctx: Context<Self>, name: String, days: u32) -> Result<()> {
        let header_act = &mut ctx.accounts.header;   
        let rent_info_act = &mut ctx.accounts.rent_info;
        require_valid_full_name(&name)?;
        let current_timestamp = Clock::get()?.unix_timestamp;
        require!(header_act.rent_enabled == 1, CustomError::RentDisabled);
        require!(current_timestamp < header_act.owner_end, CustomError::NameExpired);
        require!(header_act.user_end == 0 || header_act.user_end < current_timestamp, CustomError::AlreadyLeased);
        require!(days >= 1, CustomError::DaysTooSmall);
        
        let duration = days as i64 * 24 * 60 * 60;
        let end_timestamp = current_timestamp + duration;
        require!(end_timestamp <= header_act.owner_end, CustomError::RentTooLong);

        let parents_names = parse_enity_all_names(&name)?;   
        let fees= header_act.rent_per_day * days as u64;

        header_act.user = ctx.accounts.operator.key();
        header_act.user_start = current_timestamp;
        header_act.user_end = end_timestamp;
        let operator_key = ctx.accounts.operator.key();

        rent_info_act.authority = operator_key;
        rent_info_act.config_json = "".to_string();

        msg!("EntityRentBid:{} days:{} fees:{}", name, days, fees);
        emit!(BidEvent {
            name: name,
            kind: "EntityRent".to_string(),
            operator: operator_key,
            start: current_timestamp,
            end: end_timestamp,
            fees: fees,
        });

        entity_rent_bid_payment(&ctx, &parents_names, fees)?; 
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityRentInfoUpdate<'info> {
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

impl EntityRentInfoUpdate<'_> {
    pub fn handle(ctx: Context<Self>, name: String, info: String) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let info_act = &mut ctx.accounts.rent_info;
        require_valid_full_name(&name)?;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < header_act.owner_end,
            CustomError::NameExpired
        );
        
        info_act.config_json = info;
        msg!("EntityRentInfoUpdate:{}", name);
        emit!(ConfigUpdateEvent {
            name: name,
            kind: "EntityRentInfo".to_string(),
            new_value: info_act.config_json.clone(),
            operator: ctx.accounts.updater.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityRentRenew<'info> {
    #[account(
        mut,
        seeds = [b"name", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
        constraint = header.user == operator.key()  @ CustomError::Unauthorized
    )]
    pub header: Account<'info, HeaderInfo>,

    #[account(
        mut,
        seeds = [b"meta", &hash(name.as_bytes()).to_bytes()[..16]],
        bump,
    )]
    pub meta: Account<'info, AuthJsonConfig>,

    #[account(signer)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        seeds = [b"treasury_config"],
        bump
    )]
    pub protocol_config: Account<'info, AuthJsonConfig>,
    #[account(mut)]
    pub protocol_fee_receiver: SystemAccount<'info>,  
    #[account(mut)]
    pub fee_receiver: SystemAccount<'info>, 
}

pub fn entity_rent_renew_payment(
    ctx: &Context<EntityRentRenew>, 
    parent_names: &[String],
    fees: u64
) -> Result<()> {
    let meta_act = &ctx.accounts.meta;

    let protocol_config_act = &ctx.accounts.protocol_config;
    let eco_meta_info = &ctx.remaining_accounts[0];

    let parent_count = parent_names.len();
    let from_account: AccountInfo<'_> = ctx.accounts.operator.to_account_info();     
    let eco_name = parent_names[0].clone();
    let (eco_meta_key, _bump) = Pubkey::find_program_address(
        &[b"meta", &hash(eco_name.as_bytes()).to_bytes()[..16]], 
        ctx.program_id
    );
    require!(eco_meta_info.key() == eco_meta_key, CustomError::InvalidMetaPda);
    let protocol_config = parse_treasury_config(&protocol_config_act.config_json)?;
    require!(
        ctx.accounts.protocol_fee_receiver.key() == protocol_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );
    let meta_config = parse_meta_config(&meta_act.config_json)?;
    require!(
        ctx.accounts.fee_receiver.key() == meta_config.fee_receiver,
        CustomError::FeeReceiverMismatch
    );

    let mut eco_meta_data: &[u8] = &eco_meta_info.data.borrow();
    let eco_meta_config_account = AuthJsonConfig::try_deserialize(&mut eco_meta_data)?;
    let eco_meta_config = parse_meta_config(&eco_meta_config_account.config_json)?;
    let pay_token_str = eco_meta_config.pay_token.clone();
    
    if pay_token_str.to_lowercase() == "11111111111111111111111111111111111111111111" {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: from_account.clone(), 
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        );
        transfer(cpi_context, fees)?;
    } else {
        let ata_to = &ctx.remaining_accounts[1];
        let ata_from = &ctx.remaining_accounts[2];
        let ata_authority = &ctx.remaining_accounts[3];            
        let ata_mint = &ctx.remaining_accounts[4];
        let ata_program = &ctx.remaining_accounts[5];
        let mut decimals = 9;
        {
            let token_mint_pubkey = Pubkey::try_from(pay_token_str.as_str())
                .map_err(|_| error!(CustomError::InvalidTokenMint))?;
            require!(
                token_mint_pubkey == ata_mint.key(),
                CustomError::MintMismatchPayToken
            );
            let ata_from_data = ata_from.data.borrow();
            let from_account_state = StateWithExtensions::<Account2022>::unpack(&ata_from_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let from_token_account = &from_account_state.base;
            let ata_to_data = ata_to.data.borrow();
            let to_account_state = StateWithExtensions::<Account2022>::unpack(&ata_to_data)
                .map_err(|_| error!(CustomError::InvalidTokenAccount))?;
            let to_token_account = &to_account_state.base;
            let ata_mint_data = ata_mint.data.borrow();
            let mint_state = StateWithExtensions::<Mint2022>::unpack(&ata_mint_data)?;
            let mint_account = &mint_state.base;
            decimals = mint_account.decimals;
            require!(
                from_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                from_token_account.owner == ata_authority.key(),
                CustomError::TokenAccountOwnerMismatch
            );
            require!(
                to_token_account.mint == token_mint_pubkey,
                CustomError::MintMismatch
            );
            require!(
                to_token_account.owner == ctx.accounts.fee_receiver.key(),
                CustomError::InvalidFeeReceiver
            );
        }
        transfer_checked(
            CpiContext::new(
                ata_program.to_account_info(),
                TransferChecked {
                    from: ata_from.to_account_info(),
                    mint: ata_mint.to_account_info(),
                    to: ata_to.to_account_info(),
                    authority: ata_authority.to_account_info(),
                },
            ),
            fees,
            decimals,
        )?;
    }
    let cpi_context2 = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: from_account.clone(), 
            to: ctx.accounts.protocol_fee_receiver.to_account_info(),
        },
    );
    transfer(cpi_context2, protocol_config.protocol_fees)?;
    Ok(())
}

impl EntityRentRenew<'_> {
    pub fn handle(ctx: Context<Self>, name: String, days: u32) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        require_valid_full_name(&name)?;
        let current_timestamp = Clock::get()?.unix_timestamp;
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
        let parents_names = parse_enity_all_names(&name)?;   
        let fees= header_act.rent_per_day * days as u64;
        emit!(RenewEvent {
            name: header_act.name.clone(),
            kind: "EntityRent".to_string(),
            start: header_act.user_start,
            end: header_act.user_end,
            operator: ctx.accounts.operator.key(),
            duration: days,
        });
        entity_rent_renew_payment(&ctx, &parents_names, fees)?;          
        msg!("Renewing rent name:{} days:{} fees:{}", name, days, fees);       

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct EntityRentTransfer<'info> {
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
impl EntityRentTransfer<'_> {
    pub fn handle(ctx: Context<Self>, name: String, new_owner: Pubkey) -> Result<()> {
        let header_act = &mut ctx.accounts.header;
        let info_act = &mut ctx.accounts.rent_info;
        require_valid_full_name(&name)?;
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
            kind: "EntityRent".to_string(),
            new_owner: new_owner,
            operator: ctx.accounts.operator.key(),
        });

        Ok(())
    }
}