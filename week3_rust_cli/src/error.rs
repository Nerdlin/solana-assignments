use std::fmt;

/// Ошибки программы, моделирующие стандартные ProgramError в Solana.
#[allow(dead_code)]
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum ProgramError {
    /// Недостаточно средств (лампортов) для выполнения операции
    InsufficientFunds,
    /// Аккаунт не подписал транзакцию, хотя подпись обязательна
    MissingRequiredSignature,
    /// Ошибка десериализации входных данных инструкции (Borsh)
    InvalidInstructionData,
    /// Неверный владелец аккаунта (Program ID mismatch)
    IncorrectProgramId,
    /// Аккаунт уже инициализирован
    AccountAlreadyInitialized,
    /// Переполнение числа (u64 overflow/underflow)
    ArithmeticOverflow,
    /// Аккаунт не найден по указанному адресу
    AccountNotFound,
    /// Пользовательская ошибка
    Custom(u32),
}

impl fmt::Display for ProgramError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProgramError::InsufficientFunds => write!(f, "ProgramError: Insufficient funds (лапмортов не хватает)"),
            ProgramError::MissingRequiredSignature => write!(f, "ProgramError: Missing required signature (нет подписи)"),
            ProgramError::InvalidInstructionData => write!(f, "ProgramError: Invalid instruction data (ошибка Borsh)"),
            ProgramError::IncorrectProgramId => write!(f, "ProgramError: Incorrect program id (чужой аккаунт)"),
            ProgramError::AccountAlreadyInitialized => write!(f, "ProgramError: Account already initialized"),
            ProgramError::ArithmeticOverflow => write!(f, "ProgramError: Arithmetic overflow (переполнение)"),
            ProgramError::AccountNotFound => write!(f, "ProgramError: Account not found"),
            ProgramError::Custom(code) => write!(f, "ProgramError: Custom error code {}", code),
        }
    }
}

impl std::error::Error for ProgramError {}
