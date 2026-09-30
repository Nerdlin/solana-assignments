use borsh::{BorshDeserialize, BorshSerialize};
use std::fmt;

/// Модель 32-байтного публичного ключа Solana
#[derive(Clone, Copy, PartialEq, Eq, Hash, BorshSerialize, BorshDeserialize)]
pub struct Pubkey(pub [u8; 32]);

#[allow(dead_code)]
impl Pubkey {
    pub const fn new(bytes: [u8; 32]) -> Self {
        Pubkey(bytes)
    }

    /// Создание фиктивного ключа из строкового идентификатора (хеширование/паддинг)
    pub fn from_str_simple(name: &str) -> Self {
        let mut bytes = [0u8; 32];
        let src = name.as_bytes();
        let len = src.len().min(32);
        bytes[..len].copy_from_slice(&src[..len]);
        Pubkey(bytes)
    }
}

impl fmt::Debug for Pubkey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self)
    }
}

impl fmt::Display for Pubkey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Выводим читабельный hex-вид (первые и последние 4 байта, как в эксплорере)
        let hex: String = self.0.iter().map(|b| format!("{:02x}", b)).collect();
        write!(f, "{}...{}", &hex[0..6], &hex[hex.len() - 6..])
    }
}

/// Модель аккаунта Solana (AccountInfo) в памяти
#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct Account {
    pub key: Pubkey,
    pub lamports: u64,
    pub data: Vec<u8>,
    pub owner: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

impl Account {
    pub fn new(key: Pubkey, lamports: u64, owner: Pubkey) -> Self {
        Self {
            key,
            lamports,
            data: Vec::new(),
            owner,
            is_signer: false,
            is_writable: true,
        }
    }
}

/// Состояние счетчика, сериализуемое через Borsh
#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq, Clone)]
pub struct CounterState {
    pub count: u64,
    pub authority: Pubkey,
    pub is_initialized: bool,
}

/// Состояние профиля пользователя, сериализуемое через Borsh
#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq, Clone)]
pub struct UserProfileState {
    pub authority: Pubkey,
    pub username: String,
    pub bio: String,
    pub score: u64,
}
