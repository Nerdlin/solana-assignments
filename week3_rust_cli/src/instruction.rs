use borsh::{BorshDeserialize, BorshSerialize};
use crate::error::ProgramError;

/// Перечисление всех инструкций программы (типичный паттерн в нативном Solana Rust).
/// Входные байты десериализуются в один из вариантов этого enum.
#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq, Clone)]
pub enum ProgramInstruction {
    /// Инициализация счетчика со стартовым значением
    /// Параметры: [initial_count]
    InitializeCounter { initial_count: u64 },

    /// Инкремент счетчика на указанное число
    /// Параметры: [amount]
    Increment { amount: u64 },

    /// Декремент счетчика
    /// Параметры: [amount]
    Decrement { amount: u64 },

    /// Создание или обновление профиля пользователя
    /// Параметры: [username, bio]
    UpdateProfile { username: String, bio: String },

    /// Перевод лампортов между аккаунтами
    /// Параметры: [lamports]
    TransferLamports { lamports: u64 },
}

impl ProgramInstruction {
    /// Десериализация инструкций из байтового буфера (аналог unpack в Solana)
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        borsh::from_slice::<Self>(input).map_err(|_| ProgramError::InvalidInstructionData)
    }

    /// Сериализация инструкции в байтовый буфер для передачи в транзакцию
    pub fn pack(&self) -> Vec<u8> {
        borsh::to_vec(self).expect("Serialization cannot fail for valid struct")
    }
}
