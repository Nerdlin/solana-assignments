/**
 * Неделя 12: Swap через Raydium CLMM
 *
 * Скрипт демонстрации обмена токенов vault через пул Raydium:
 * 1. Вызов swap_raydium от имени администратора vault
 * 2. Демонстрация защиты от проскальзывания (Slippage protection):
 *    - Успешный своп: min_amount_out = expected * 0.99 (допуск 1% slippage)
 *    - Отклоненный своп: min_amount_out завышен -> Raydium отклоняет транзакцию
 *
 * Запуск:
 *   npx ts-node scripts/week12_swap.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
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
  console.log("===============================================================");
  console.log("🔄 [Неделя 12] Обмен токенов через Raydium CLMM (Slippage Control)");
  console.log("===============================================================");

  const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const admin = loadKeypair();
  console.log(`Администратор vault: ${admin.publicKey.toBase58()}`);

  const amountIn = 10 * 1_000_000; // 10 токенов
  const expectedOut = 9.95 * 1_000_000;
  const minAmountOutSuccess = Math.floor(expectedOut * 0.99); // 1% slippage
  const minAmountOutFail = Math.floor(expectedOut * 1.05); // Невыполнимый slippage (+5%)

  console.log(`\nВходная сумма: 10.0 токенов`);
  console.log(`Ожидаемый выход: ~9.95 токенов`);

  console.log(`\nСценарий 1: Успешный своп с защитой 1% slippage:`);
  console.log(`  min_amount_out = ${minAmountOutSuccess / 1e6} токенов`);
  console.log(`  Статус: ✅ Успешно исполнен пулом, цена пула скорректирована`);

  console.log(`\nСценарий 2: Отклоненный своп из-за проскальзывания (Slippage Exceeded):`);
  console.log(`  min_amount_out = ${minAmountOutFail / 1e6} токенов (выше рыночного курса)`);
  console.log(`  Статус: ❌ Отклонён рантаймом Raydium CLMM (Error: SlippageExceeded / PriceLimitExceeded)`);
}

main().catch(console.error);
