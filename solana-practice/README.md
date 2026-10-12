# 🚀 Solana Practice (Helius Devnet & SPL Token)

Практическая работа по взаимодействию с блокчейном Solana через `@solana/web3.js` и `@solana/spl-token` с использованием выделенного **Helius RPC**.

---

## 📋 Что реализовано

1. **`src/solana-practice.ts` (`npm run dev`)**:
   - Подключение к Solana Devnet через быстрый и стабильный RPC-провайдер **Helius**.
   - Чтение приватного ключа из `.env` (Base58 из Phantom или Solana CLI) с автоматическим фолбэком на локальный кошелек.
   - Проверка баланса отправителя и автоматический запрос airdrop при необходимости.
   - Формирование атомарной транзакции с двумя инструкциями:
     1. `SystemProgram.transfer` — перевод SOL на адрес получателя.
     2. `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` — прикрепление текстового сообщения (Memo) в блокчейн.
   - Подтверждение транзакции, получение слота и вывод ссылки на Solana Explorer.

2. **`src/token-mint.ts` (`npm run mint`)**:
   - Создание нового токена `MYCOIN` (SPL Mint, 6 знаков после запятой).
   - Создание Associated Token Account (ATA) для создателя.
   - Чеканка (Mint) 10 000 токенов на кошелек.
   - Рассылка по 100 токенов трем одногруппникам (`RECIPIENT_1`, `RECIPIENT_2`, `RECIPIENT_3`) с созданием их ATA.
   - Сжигание (Burn) 50 токенов с кошелька создателя.
   - Проверка итогового баланса (9 650 токенов) и вывод всех ончейн-ссылок в Explorer.

---

## ⚙️ Установка и настройка

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
Скопируйте пример конфигурации в `.env`:
```bash
cp .env.example .env
```
или создайте `.env`:
```env
# Helius RPC Endpoint
HELIUS_API_KEY=1b50e66f-c639-4adc-95b7-c9ada545289b
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=1b50e66f-c639-4adc-95b7-c9ada545289b

# Приватный ключ кошелька в формате Base58 (экспорт из Phantom)
SECRET_KEY=""

# Адреса одногруппников для раздачи токенов
RECIPIENT_1=""
RECIPIENT_2=""
RECIPIENT_3=""
```

> 💡 **Фолбэки и отказоустойчивость:**
> - Если `SECRET_KEY` не указан, скрипт автоматически использует ваш локальный ключ Solana CLI (`~/.config/solana/id.json`) либо сгенерирует безопасный тестовый ключ в `wallet.json`.
> - Если `RECIPIENT_1..3` не указаны, скрипт автоматически сгенерирует 3 тестовых адреса получателей для демонстрации.

---

## 🏃 Запуск

### Перевод SOL с текстовым сообщением (Memo)
```bash
npm run dev
```

### Создание, чеканка, раздача и сжигание токена
```bash
npm run mint
```

### Сборка TypeScript
```bash
npm run build
```
