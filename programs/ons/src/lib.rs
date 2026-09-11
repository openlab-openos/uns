pub mod instructions;
pub mod error;
pub mod events;
mod json_parser;
use anchor_lang::prelude::*;
use instructions::{treasury::*, ecosystem::*, entity::*, template::*,};

declare_id!("unLUujZuXm7dJoZXwLanuVKBbeUHUDaJ85R9Z8FjLKR");

#[program]
pub mod ons {
    use super::*;

    pub fn treasury_initialize(ctx: Context<TreasuryInitialize>, config_json: String) -> Result<()> {
        TreasuryInitialize::handle(ctx, config_json)
    }

    pub fn treasury_update(ctx: Context<TreasuryUpdate>, config_json: String) -> Result<()> {
        TreasuryUpdate::handle(ctx, config_json)
    }

    pub fn ecotpl_initialize(ctx: Context<EcoTplInitialize>, config_json: String) -> Result<()> {
        EcoTplInitialize::handle(ctx, config_json)
    }

    pub fn ecotpl_update(ctx: Context<EcoTplUpdate>, config_json: String) -> Result<()> {
        EcoTplUpdate::handle(ctx, config_json)
    }

    pub fn entitytpl_initialize(ctx: Context<EntityTplInitialize>, config_json: String) -> Result<()> {
        EntityTplInitialize::handle(ctx, config_json)
    }

    pub fn entitytpl_update(ctx: Context<EntityTplUpdate>, config_json: String) -> Result<()> {
        EntityTplUpdate::handle(ctx, config_json)
    }

    pub fn eco_create(ctx: Context<EcoCreate>, name: String, meta: String, body: String, years: u8) -> Result<()> {
        EcoCreate::handle(ctx, name, meta, body, years)
    }

    pub fn eco_meta_update(ctx: Context<EcoMetaUpdate>, name: String, meta: String) -> Result<()> {
        EcoMetaUpdate::handle(ctx, name, meta)
    }

    pub fn eco_body_update(ctx: Context<EcoBodyUpdate>, name: String, body: String) -> Result<()> {
        EcoBodyUpdate::handle(ctx, name, body)
    }

    pub fn eco_sale_ask(ctx: Context<EcoSaleAsk>, name: String, enabled: u8, sell_price: u64) -> Result<()> {
        EcoSaleAsk::handle(ctx, name, enabled, sell_price)
    }

    pub fn eco_sale_bid(ctx: Context<EcoSaleBid>, name: String) -> Result<()> {
        EcoSaleBid::handle(ctx, name)
    }

    pub fn eco_owner_renew(ctx: Context<EcoOwnerRenew>, name: String, years: u8) -> Result<()> {
        EcoOwnerRenew::handle(ctx, name, years)
    }

    pub fn eco_owner_transfer(ctx: Context<EcoOwnerTransfer>, name: String, new_owner: Pubkey) -> Result<()> {
        EcoOwnerTransfer::handle(ctx, name, new_owner)
    }

	pub fn eco_rent_ask(ctx: Context<EcoRentAsk>, name: String, enabled: u8, rent_per_day: u64) -> Result<()> {
        EcoRentAsk::handle(ctx, name, enabled, rent_per_day)
    }

    pub fn eco_rent_bid(ctx: Context<EcoRentBid>, name: String, days: u32) -> Result<()> {
        EcoRentBid::handle(ctx, name, days)
    }
    
    pub fn eco_rent_info_update(ctx: Context<EcoRentInfoUpdate>, name: String, info: String) -> Result<()> {
        EcoRentInfoUpdate::handle(ctx, name, info)
    }

    pub fn eco_rent_renew(ctx: Context<EcoRentRenew>, name: String, days: u32) -> Result<()> {
        EcoRentRenew::handle(ctx, name, days)
    }

    pub fn eco_rent_transfer(ctx: Context<EcoRentTransfer>, name: String, new_owner: Pubkey) -> Result<()> {
        EcoRentTransfer::handle(ctx, name, new_owner)
    }

    pub fn entity_create(ctx: Context<EntityCreate>, name: String, meta: String, body: String, years: u8) -> Result<()> {
        EntityCreate::handle(ctx, name, meta, body, years)
    }

    pub fn entity_meta_update(ctx: Context<EntityMetaUpdate>, name: String, meta: String) -> Result<()> {
        EntityMetaUpdate::handle(ctx, name, meta)
    }

    pub fn entity_body_update(ctx: Context<EntityBodyUpdate>, name: String, body: String) -> Result<()> {
        EntityBodyUpdate::handle(ctx, name, body)
    }

    pub fn entity_sale_ask(ctx: Context<EntitySaleAsk>, name: String, enabled: u8, rent_per_day: u64) -> Result<()> {
        EntitySaleAsk::handle(ctx, name, enabled, rent_per_day)
    }

    pub fn entity_sale_bid(ctx: Context<EntitySaleBid>, name: String) -> Result<()> {
        EntitySaleBid::handle(ctx, name)
    }

    pub fn entity_owner_renew(ctx: Context<EntityOwnerRenew>, name: String, years: u8) -> Result<()> {
        EntityOwnerRenew::handle(ctx, name, years)
    }

    pub fn entity_owner_transfer(ctx: Context<EntityOwnerTransfer>, name: String, new_owner: Pubkey) -> Result<()> {
        EntityOwnerTransfer::handle(ctx, name, new_owner)
    }

    pub fn entity_rent_ask(ctx: Context<EntityRentAsk>, name: String, enabled: u8, rent_per_day: u64) -> Result<()> {
        EntityRentAsk::handle(ctx, name, enabled, rent_per_day)
    }

    pub fn entity_rent_bid(ctx: Context<EntityRentBid>, name: String, days: u32) -> Result<()> {
        EntityRentBid::handle(ctx, name, days)
    }

    pub fn entity_rent_info_update(ctx: Context<EntityRentInfoUpdate>, name: String, info: String) -> Result<()> {
        EntityRentInfoUpdate::handle(ctx, name, info)
    }

    pub fn entity_rent_renew(ctx: Context<EntityRentRenew>, name: String, days: u32) -> Result<()> {
        EntityRentRenew::handle(ctx, name, days)
    }

    pub fn entity_rent_transfer(ctx: Context<EntityRentTransfer>, name: String, new_owner: Pubkey) -> Result<()> {
        EntityRentTransfer::handle(ctx, name, new_owner)
    }

    pub fn name_close(ctx: Context<NameClose>, name: String) -> Result<()> {
        NameClose::handle(ctx, name)
    }
}
