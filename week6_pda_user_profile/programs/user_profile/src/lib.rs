use anchor_lang::prelude::*;

// Идентификатор программы ончейн профиля
declare_id!("Prof1Le111111111111111111111111111111111111");

pub const MAX_USERNAME_LEN: usize = 32;
pub const MAX_BIO_LEN: usize = 128;
pub const MAX_AVATAR_URL_LEN: usize = 128;

#[program]
pub mod user_profile {
    use super::*;

    /// Создание децентрализованного профиля по детерминированному PDA адресу
    pub fn create_profile(
        ctx: Context<CreateProfile>,
        username: String,
        bio: String,
        avatar_url: String,
    ) -> Result<()> {
        require!(username.len() <= MAX_USERNAME_LEN, ProfileError::UsernameTooLong);
        require!(bio.len() <= MAX_BIO_LEN, ProfileError::BioTooLong);
        require!(avatar_url.len() <= MAX_AVATAR_URL_LEN, ProfileError::AvatarUrlTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.authority = ctx.accounts.authority.key();
        profile.username = username.clone();
        profile.bio = bio;
        profile.avatar_url = avatar_url;
        profile.bump = ctx.bumps.profile;

        msg!("👤 Профиль успешно создан через PDA!");
        msg!("  PDA адрес: {}", profile.key());
        msg!("  Владелец:  {}", profile.authority);
        msg!("  Username:  {}", username);

        Ok(())
    }

    /// Обновление существующего профиля (только владелец может подписать транзакцию)
    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        new_bio: String,
        new_avatar_url: String,
    ) -> Result<()> {
        require!(new_bio.len() <= MAX_BIO_LEN, ProfileError::BioTooLong);
        require!(new_avatar_url.len() <= MAX_AVATAR_URL_LEN, ProfileError::AvatarUrlTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.bio = new_bio.clone();
        profile.avatar_url = new_avatar_url;

        msg!("✏️ Профиль обновлен для пользователя: {}", profile.username);
        msg!("  Новый bio: {}", new_bio);

        Ok(())
    }

    /// Удаление профиля: закрывает PDA аккаунт и возвращает всю арендную плату (Rent) владельцу
    pub fn delete_profile(ctx: Context<DeleteProfile>) -> Result<()> {
        msg!("🗑️ Профиль удален! Лампорты за аренду возвращены на адрес {}", ctx.accounts.authority.key());
        Ok(())
    }
}

/// Контекст создания профиля с генерацией Program Derived Address (PDA)
#[derive(Accounts)]
#[instruction(username: String, bio: String, avatar_url: String)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = UserProfile::LEN,
        // Вычисление PDA: семена "user-profile" и публичный ключ создателя
        seeds = [b"user-profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Контекст обновления профиля
#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        // Проверяем соответствие семян и bump
        seeds = [b"user-profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ ProfileError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,

    pub authority: Signer<'info>,
}

/// Контекст удаления профиля (возврат рента через close constraint)
#[derive(Accounts)]
pub struct DeleteProfile<'info> {
    #[account(
        mut,
        seeds = [b"user-profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ ProfileError::Unauthorized,
        close = authority // Автоматически переводит все lamports на аккаунт authority и обнуляет данные
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Ончейн структура аккаунта профиля
#[account]
pub struct UserProfile {
    pub authority: Pubkey,   // 32 байта
    pub username: String,    // 4 байта длины + до 32 байт UTF-8
    pub bio: String,         // 4 байта длины + до 128 байт UTF-8
    pub avatar_url: String,  // 4 байта длины + до 128 байт UTF-8
    pub bump: u8,            // 1 байт
}

impl UserProfile {
    // Точный расчет занимаемого места в байтах для освобождения от аренды (Rent Exemption)
    pub const LEN: usize = 8  // Anchor discriminator
        + 32                 // authority
        + 4 + MAX_USERNAME_LEN
        + 4 + MAX_BIO_LEN
        + 4 + MAX_AVATAR_URL_LEN
        + 1;                 // bump
}

/// Пользовательские ошибки для валидации входных данных
#[error_code]
pub enum ProfileError {
    #[msg("Имя пользователя превышает максимальную длину (32 символа)")]
    UsernameTooLong,
    #[msg("Описание профиля (bio) превышает максимальную длину (128 символов)")]
    BioTooLong,
    #[msg("Ссылка на аватар превышает максимальную длину (128 символов)")]
    AvatarUrlTooLong,
    #[msg("У вас нет прав для изменения этого профиля")]
    Unauthorized,
}
