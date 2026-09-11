use anchor_lang::prelude::*;
#[error_code]
pub enum CustomError {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Name empty")]
    NameEmpty,
    #[msg("Json too long")]
    JsonTooLong,
    #[msg("Owner mismatch")]
    OwnerMismatch,
    #[msg("Renter mismatch")]
    RenterMismatch,
    #[msg("Already leased")]
    AlreadyLeased,
    #[msg("Rent too long")]
    RentTooLong,
    #[msg("Sale disabled")]
    SaleDisabled,
    #[msg("Rent disabled")]
    RentDisabled,
    #[msg("Years too small")]
    YearsTooSmall,
    #[msg("Days too small")]
    DaysTooSmall,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid treasury")]
    InvalidTreasury,
    #[msg("Invalid treasury configuration")]
    InvalidTreasuryConfig,
    #[msg("Invalid meta Configuration")]
    InvalidMetaConfig,
    #[msg("Invalid json format")]
    InvalidJsonFormat,
    #[msg("Mint mismatch between accounts")]
    MintMismatch,
    #[msg("Mint mismatch pay token")]
    MintMismatchPayToken,
    #[msg("Token account owner mismatch")]
    TokenAccountOwnerMismatch,
    #[msg("FeeReceiver mismatch")]
    FeeReceiverMismatch,
    #[msg("Name closer mismatch")]
    NameCloserMismatch,
    #[msg("Invalid character")]
    InvalidCharacter,
    #[msg("Name in use")]
    NameInUse,
    #[msg("Name expired")]
    NameExpired,
    #[msg("Name not expired")]
    NameNotExpired,
    #[msg("Rent expired")]
    RentExpired,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    #[msg("Missing eco separator")]
    MissingEcoSeparator,
    #[msg("Invalid entity name")]
    InvalidEntityName,
    #[msg("Max entity level is 4")]
    MaxEntityLevelIsFour,
    #[msg("Config pda not found")]
    ConfigPdaNotFound,
    #[msg("Deserialization error")]
    DeserializationError,
    #[msg("Invalid fee receiver")]
    InvalidFeeReceiver,
    #[msg("Invalid meta pda")]
    InvalidMetaPda,
    #[msg("Parent not created")]
    ParentNotCreated,
    #[msg("Missing parent meta account")]
    MissingParentMetaAccount,
    #[msg("Invalid receiver pda")]
    InvalidReceiverPda,
    #[msg("Invalid fees")]
    InvalidFees,
    #[msg("Invalid enabled value")]
    InvalidEnabled,
}