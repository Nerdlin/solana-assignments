/**
 * Неделя 13: Позиция в CLMM-пуле — Открытие, сбор комиссий и закрытие позиции
 *
 * Действия:
 * 1. open_raydium_position: vault открывает позицию в диапазоне [tick_lower, tick_upper].
 *    NFT позиции чеканится на адрес vault_state PDA (программа владеет позицией).
 * 2. collect_fees: сбор накопленных комиссий с торговых свопов пула.
 * 3. close_raydium_position: вывод 100% ликвидности и сжигание position NFT.
 *
 * Запуск:
 *   npx ts-node scripts/week13_position_management.ts
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
  console.log("==========================================================================");
  console.log("🎯 [Неделя 13] Управление позицией CLMM: открытие, сбор комиссий, закрытие");
  console.log("==========================================================================");

  const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const admin = loadKeypair();
  console.log(`Администратор vault: ${admin.publicKey.toBase58()}`);

  console.log("\nШаг 1. Открытие позиции в Raydium CLMM:");
  console.log("  • Владелец Position NFT: VaultState PDA (seeds: [b\"vault\", token_mint])");
  console.log("  • Диапазон цен:          ±10% от текущего тика (концентрированная ликвидность)");
  console.log("  • Инструкция:            open_raydium_position (CPI к open_position_with_token22_nft)");

  console.log("\nШаг 2. Торговая активность и сбор комиссий:");
  console.log("  • Трейдеры совершают свопы через пул Raydium CLMM");
  console.log("  • За каждый своп внутри диапазона накапливаются протокольные комиссии");
  console.log("  • Инструкция: decrease_liquidity_v2 с liquidity=0 (забирает заработанные fee)");

  console.log("\nШаг 3. Закрытие позиции:");
  console.log("  • Вывод 100% ликвидности обратно в хранилище vault (Token A + Token B)");
  console.log("  • Сжигание position NFT через CPI close_position");
  console.log("  • Возврат rentSOL за аккаунт позиции на кошелек администратора");
}

main().catch(console.error);
