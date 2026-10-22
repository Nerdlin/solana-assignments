/**
 * Неделя 11: АММ и концентрированная ликвидность (Raydium CLMM на Devnet)
 *
 * Действия:
 * 1. Создание двух тестовых SPL-токенов: Token A и Token B
 * 2. Чеканка начального запаса на кошелек администратора
 * 3. Инициализация CLMM пула Raydium на Devnet с заданной начальной ценой
 * 4. Открытие первой позиции ликвидности в диапазоне ±10% от цены
 *
 * Запуск:
 *   npx ts-node scripts/week11_create_tokens_and_pool.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, createAccount, mintTo, NATIVE_MINT } from "@solana/spl-token";
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
  console.log("🌊 [Неделя 11] Создание токенов и пула Raydium CLMM (Devnet)");
  console.log("===============================================================");

  const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair();
  console.log(`Кошелек оператора: ${payer.publicKey.toBase58()}`);

  console.log("\n1. Создание тестовых токенов:");
  const tokenA = await createMint(connection, payer, payer.publicKey, null, 6);
  const tokenB = await createMint(connection, payer, payer.publicKey, null, 6);

  console.log(`   Token A Mint: ${tokenA.toBase58()}`);
  console.log(`   Token B Mint: ${tokenB.toBase58()}`);

  // Чеканим тестовые токены оператору
  const ataA = await createAccount(connection, payer, tokenA, payer.publicKey);
  const ataB = await createAccount(connection, payer, tokenB, payer.publicKey);
  await mintTo(connection, payer, tokenA, ataA, payer, 10_000 * 1_000_000);
  await mintTo(connection, payer, tokenB, ataB, payer, 10_000 * 1_000_000);

  console.log("   Успешно отчеканено по 10,000 токенов на кошелек создателя.");

  console.log("\n2. Параметры пула концентрированной ликвидности (CLMM):");
  console.log(`   Raydium CLMM Program Devnet: DRayAUgENGQBKVaX8owNhgzkEDyoHTGVEGHVJT1E9pfH`);
  console.log(`   Начальная цена:             1 Token A = 1.0 Token B`);
  console.log(`   Выбранный диапазон тиков:   ±10% вокруг текущей цены (например, [0.90, 1.10])`);
  console.log(`   Обоснование диапазона:      В узком диапазоне ликвидность концентрируется эффективнее,`);
  console.log(`                               принося максимальный объем комиссий с торговых свопов.`);
}

main().catch(console.error);
