# Практические задания по курсу Solana & Web3 (Недели 3 — 7)

Данный репозиторий содержит решения практических заданий силлабуса:

| Неделя | Тема / Модуль | Задание | Директория |
| :---: | :--- | :--- | :--- |
| **3** | **Rust для Solana-разработчика** | Создать небольшую CLI-программу на Rust с использованием конструкций, которые понадобятся в Solana-разработке. | [`week3_rust_cli/`](./week3_rust_cli/) |
| **4** | **Первая Solana Program** | Создать и задеплоить первую Solana Program в Devnet. | [`week4_solana_program/`](./week4_solana_program/) |
| **5** | **Anchor Framework** | Создать Counter Program и взаимодействовать с ней через client. | [`week5_anchor_counter/`](./week5_anchor_counter/) |
| **6** | **Accounts, PDAs и архитектура программ** | Создать децентрализованный on-chain профиль с использованием PDA. | [`week6_pda_user_profile/`](./week6_pda_user_profile/) |
| **7** | **SPL Tokens и Token Extensions** | Создать собственный токен: выпуск, transfer, metadata и взаимодействие через client. | [`week7_spl_tokens/`](./week7_spl_tokens/) |

---

## 📌 Краткий обзор каждого задания

### [Неделя 3: Rust CLI Simulator](./week3_rust_cli/)
* **Что реализовано:** Полноценный CLI-симулятор виртуальной машины Solana (SVM) на чистом Rust.
* **Использованные конструкции Rust и концепции Solana:**
  * Сериализация и десериализация бинарного формата **Borsh** (`#[derive(BorshSerialize, BorshDeserialize)]`, `pack`, `unpack`).
  * Модель аккаунтов Solana: `Account`, `Pubkey`, `lamports`, `data`, `owner`, флаги `is_signer` и `is_writable`.
  * Перечисление `ProgramInstruction` для маршрутизации инструкций через `match`.
  * Безопасная арифметика (`checked_add`, `checked_sub`) и пользовательские ошибки `ProgramError`.
  * Управление памятью и мутабельными ссылками через `accounts.split_at_mut(1)`.
* **Запуск:** `cargo run -- demo`

---

### [Неделя 4: Первая Solana Program](./week4_solana_program/)
* **Что реализовано:** Нативный смарт-контракт на Rust с точкой входа `entrypoint!(process_instruction)` и клиент на `@solana/web3.js`.
* **Функционал:** Логирование в блокчейн через `msg!()`, проверка владельца аккаунта `account.owner == program_id`, счетчик вызовов в `GreetingAccount` и сохранение кастомных сообщений.
* **Деплой:** Подробная инструкция по 1-клик деплою в **Solana Playground** (https://beta.solpg.io) или через `solana-cli` в Devnet.
* **Клиент:** [client/client.ts](./week4_solana_program/client/client.ts) создает аккаунт данных с rent exemption и вызывает контракт.

---

### [Неделя 5: Anchor Framework](./week5_anchor_counter/)
* **Что реализовано:** Смарт-контракт счетчика на индустриальном фреймворке **Anchor**.
* **Инструкции программы:** `initialize`, `increment`, `decrement` (с валидацией `Underflow`), `set_value` (с ограничением `has_one = authority`).
* **Тесты:** Полный тестовый набор на `Mocha` + `Chai` в [tests/counter.ts](./week5_anchor_counter/tests/counter.ts).
* **Клиент:** Автономный скрипт [client/interact.ts](./week5_anchor_counter/client/interact.ts) для интерактивной работы с Devnet через IDL.

---

### [Неделя 6: Децентрализованный профиль с PDA](./week6_pda_user_profile/)
* **Что реализовано:** Смарт-контракт пользовательского ончейн-профиля с использованием детерминированных **Program Derived Addresses (PDA)**.
* **Ключевые особенности:**
  * Адрес профиля вычисляется на основе семян: `seeds = [b"user-profile", authority.key().as_ref()]`.
  * Один кошелек может иметь ровно один каноничный профиль.
  * Инструкция `delete_profile` использует `close = authority`, возвращая пользователю 100% залога за аренду аккаунта (Rent).
  * Строгая валидация длины строк (username <= 32, bio <= 128, avatar_url <= 128).

---

### [Неделя 7: SPL Tokens, Metadata & Transfer](./week7_spl_tokens/)
* **Что реализовано:** Комплексный набор TypeScript-скриптов для полного жизненного цикла токена стандарта SPL Token в Solana Devnet:
  1. `01_create_mint.ts` — выпуск нового Mint аккаунта (9 decimals).
  2. `02_create_metadata.ts` — добавление ончейн-метаданных (Name, Symbol, Logo) по стандарту Metaplex Token Metadata V3.
  3. `03_mint_tokens.ts` — создание Associated Token Account (ATA) и чеканка 10,000 токенов.
  4. `04_transfer_tokens.ts` — отправка токенов на кошелек получателя.
  5. `05_check_balances.ts` — чтение общего объема эмиссии (Total Supply) и балансов.
  6. `run_all.ts` — сквозной запуск всего пайплайна в одну команду (`npm start`).
