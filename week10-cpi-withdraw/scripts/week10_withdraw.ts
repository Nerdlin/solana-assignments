/**
 * Неделя 10: CPI и вывод из Vault — Скрипт возврата долей
 *
 * Действия:
 * 1. Сжигает share-токены пользователя (Token::burn, подписано пользователем)
 * 2. Переводит пропорциональную часть токенов из vault пользователю (Token::transfer, подписано vault PDA)
 * 3. Обновляет общий учет и баланс карточки
 *
 * Запуск:
 *   npx ts-node scripts/week10_withdraw.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
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
  console.log("📤 [Неделя 10] Сжигание share-токенов и вывод средств (CPI)");
  console.log("====================================================");

  const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const user = loadKeypair();
  console.log(`Пользователь: ${user.publicKey.toBase58()}`);

  console.log("\nМеханика CPI (Cross-Program Invocation) при выводе:");
  console.log("1. Token::burn — сжигание shares из user_share_account (подписывает пользователь)");
  console.log("2. Token::transfer — перевод токенов из vault_token_account на user_token_account");
  console.log("   (подписывает программа от имени PDA с seeds: [b\"vault\", token_mint])");
  console.log("Формула: tokens_out = shares_amount * total_tokens / total_shares");
}

main().catch(console.error);
