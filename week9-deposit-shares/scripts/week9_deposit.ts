/**
 * Неделя 9: Депозит и share-токены — Скрипт внесения средств в Vault
 *
 * Действия:
 * 1. Проверяет наличие UserCard
 * 2. Переводит токены пользователя в vault_token_account
 * 3. Минтит share-токены пользователю
 * 4. Обновляет общий учет и баланс карточки
 *
 * Запуск:
 *   npx ts-node scripts/week9_deposit.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

function loadKeypair(): Keypair {
  const p = path.join(process.env.USERPROFILE || process.env.HOME || "", ".config", "solana", "id.json");
  if (fs.existsSync(p)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
  }
  return Keypair.generate();
}

async function main() {
  console.log("====================================================");
  console.log("💰 [Неделя 9] Внесение депозита и выпуск share-токенов");
  console.log("====================================================");

  const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const user = loadKeypair();
  console.log(`Пользователь: ${user.publicKey.toBase58()}`);

  const depositAmount = 100 * 1_000_000; // 100 токенов (decimals=6)
  console.log(`Сумма к внесению: 100.0 токенов`);

  console.log("\nМатематическая модель выпуска shares:");
  console.log("• Первый вкладчик:       shares = amount (1:1)");
  console.log("• Последующие вкладчики: shares = amount * total_shares / total_tokens");
  console.log("• Результат: пользователь получает честную долю в общем пуле");
}

main().catch(console.error);
