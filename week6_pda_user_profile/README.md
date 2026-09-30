# Неделя 6: Accounts, PDAs и архитектура программ

## Задание
> Создать децентрализованный on-chain профиль с использованием PDA.

---

## 💡 Что такое PDA (Program Derived Address)?
PDA — это адрес в Solana, который:
1. Вычисляется детерминированно из набора семян (seeds) и Program ID: `findProgramAddress([seeds], programId)`.
2. Не имеет соответствующего приватного ключа (находится вне эллиптической кривой Ed25519).
3. Управляется исключительно смарт-контрактом: программа может подписывать транзакции от имени этого PDA.
4. Гарантирует уникальность: для каждого пользователя `authority` существует ровно **один** адрес профиля с семенами `[b"user-profile", authority.key().as_ref()]`.

---

## 🛠 Реализация смарт-контракта ([programs/user_profile/src/lib.rs](file:///c:/MI/пары/Startup/week6_pda_user_profile/programs/user_profile/src/lib.rs))
- **Семена PDA**: `seeds = [b"user-profile", authority.key().as_ref()], bump`.
- **Инструкции**:
  - `create_profile(username, bio, avatar_url)`: инициализация PDA, валидация длины строк, сохранение bump.
  - `update_profile(new_bio, new_avatar_url)`: обновление информации с проверкой `has_one = authority`.
  - `delete_profile()`: закрытие PDA-аккаунта (`close = authority`) и возврат 100% заблокированных в виде залога аренды (Rent) средств владельцу.
- **Тесты**: Полный цикл тестов в [tests/user_profile.ts](file:///c:/MI/пары/Startup/week6_pda_user_profile/tests/user_profile.ts).

---

## 🚀 Деплой и тестирование

### Через Solana Playground:
1. Зайдите на [https://beta.solpg.io](https://beta.solpg.io) -> Создайте проект **Anchor (Rust)**.
2. Вставьте код из [programs/user_profile/src/lib.rs](file:///c:/MI/пары/Startup/week6_pda_user_profile/programs/user_profile/src/lib.rs).
3. Соберите (**Build**) и задеплойте (**Deploy**) в кластер **Devnet**.
4. Запустите тесты прямо в браузере или через локальный клиент:
```bash
cd week6_pda_user_profile/client
npm install
npx ts-node client.ts <ВАШ_PROGRAM_ID>
```
