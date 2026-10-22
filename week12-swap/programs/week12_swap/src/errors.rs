use anchor_lang::prelude::*;

/// Ошибки программы Liquidity Vault
#[error_code]
pub enum VaultError {
    #[msg("Сумма должна быть больше нуля")]
    ZeroAmount,
    #[msg("Слишком маленькая сумма для депозита: выходит 0 share-токенов")]
    SharesTooSmall,
    #[msg("Слишком маленькая сумма для вывода: выходит 0 токенов")]
    WithdrawTooSmall,
    #[msg("Хранилище vault пусто")]
    VaultEmpty,
    #[msg("Переполнение математических операций")]
    MathOverflow,
    #[msg("Недостаточно share-токенов на карточке пользователя")]
    InsufficientShares,
    #[msg("Только администратор vault может вызывать это действие")]
    Unauthorized,
    #[msg("Нижний тик диапазона должен быть строго меньше верхнего тика")]
    InvalidTickRange,
    #[msg("Проскальзывание превысило допустимый лимит (Slippage exceeded)")]
    SlippageExceeded,
}
