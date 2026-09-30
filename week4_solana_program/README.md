# Неделя 4: Первая Solana Program

## Задание
> Создать и задеплоить первую Solana Program в Devnet.

---

## 🛠 Архитектура программы
- Исходный код смарт-контракта на Rust расположен в [src/lib.rs](file:///c:/MI/пары/Startup/week4_solana_program/src/lib.rs).
- Программа использует нативный рантайм Solana: `solana_program`, макрос `entrypoint!(process_instruction)` и логирование `msg!()`.
- При вызове программы:
  1. Проверяется, что переданный аккаунт принадлежит этой программе (`account.owner == program_id`).
  2. Десериализуется структура `GreetingAccount` (`counter: u32, message: String`).
  3. Инкрементируется счетчик вызовов `counter += 1`.
  4. Если переданы байты инструкции, они сохраняются как сообщение `message`.
  5. Состояние перезаписывается в аккаунт с помощью Borsh.

---

## 🚀 Способ 1: Деплой через Solana Playground (Самый быстрый и рекомендуемый)
Solana Playground (solpg.io) позволяет скомпилировать и задеплоить программу в Devnet прямо из браузера без настройки тяжелых C++ тулчейнов:

1. Откройте [https://beta.solpg.io](https://beta.solpg.io).
2. Нажмите **Create a new project** -> Выберите **Native (Rust)** -> Назовите проект `first_solana_program`.
3. Замените содержимое `src/lib.rs` в Playground на код из нашего файла [src/lib.rs](file:///c:/MI/пары/Startup/week4_solana_program/src/lib.rs).
4. В левом нижнем углу нажмите **Not connected** -> Создайте кошелек или подключитесь -> Убедитесь, что выбран кластер **Devnet**.
5. Нажмите **Build** (или введите в терминале `build`).
6. Получите тестовые SOL командой `solana airdrop 2` (или через кран https://faucet.solana.com).
7. Нажмите **Deploy** (или `deploy`). В консоли появится ваш `Program ID` (например: `7xK8...dev`).

---

## 💻 Способ 2: Деплой через Solana CLI
Если на машине установлен Solana CLI:
```bash
# 1. Выбор Devnet
solana config set --url https://api.devnet.solana.com

# 2. Получение тестовых SOL
solana airdrop 2

# 3. Сборка программы под BPF
cargo build-sbf

# 4. Деплой программы в Devnet
solana program deploy ./target/deploy/first_solana_program.so
```

---

## ⚡ Взаимодействие через TypeScript клиент
В папке `client` подготовлен клиент на базе `@solana/web3.js`:
```bash
cd week4_solana_program/client

# Установка зависимостей
npm install

# Запуск клиента с вашим задеплоенным Program ID
npx ts-node client.ts <ВАШ_PROGRAM_ID>
```
Клиент автоматически:
1. Создаст новый аккаунт данных и оплатит rent-exempt депозит.
2. Назначит владельцем созданного аккаунта вашу программу.
3. Отправит транзакцию с инструкцией вызова программы.
4. Выведет ссылку на транзакцию в **Solana Explorer (Devnet)**.
