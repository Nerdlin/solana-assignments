import { getMint, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getDevnetConnection, getOrCreateWallet, explorerUrl } from "./helpers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================================");
  console.log("🔍 Шаг 5: Проверка ончейн-состояния токена и балансов");
  console.log("==========================================================");

  const mintFile = path.join(__dirname, "../mint_address.json");
  if (!fs.existsSync(mintFile)) {
    console.error("❌ Токен еще не создан.");
    process.exit(1);
  }

  const { mint: mintStr } = JSON.parse(fs.readFileSync(mintFile, "utf-8"));
  const mint = new PublicKey(mintStr);
  const connection = getDevnetConnection();
  const wallet = getOrCreateWallet();

  console.log(`📍 Mint ID: ${mint.toBase58()}`);

  const mintInfo = await getMint(connection, mint);
  const decimals = mintInfo.decimals;
  const humanSupply = Number(mintInfo.supply) / 10 ** decimals;

  console.log("\n📊 Информация о токене (SPL Mint Account):");
  console.log(`   Общая эмиссия (Supply):  ${humanSupply.toLocaleString()} токенов`);
  console.log(`   Десятичные знаки:        ${decimals}`);
  console.log(`   Mint Authority:          ${mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : "None"}`);
  console.log(`   Freeze Authority:        ${mintInfo.freezeAuthority ? mintInfo.freezeAuthority.toBase58() : "None"}`);
  console.log(`   Инициализирован:         ${mintInfo.isInitialized ? "Да" : "Нет"}`);

  const ataAddress = await getAssociatedTokenAddress(mint, wallet.publicKey);
  console.log(`\n💼 Токен-аккаунт создателя (ATA): ${ataAddress.toBase58()}`);

  try {
    const ataInfo = await getAccount(connection, ataAddress);
    const balance = Number(ataInfo.amount) / 10 ** decimals;
    console.log(`   Текущий баланс: ${balance.toLocaleString()} токенов`);
  } catch (e) {
    console.log("   ATA еще не создан или не имеет баланса.");
  }

  console.log("\n🔗 Ссылка на токен в Solana Explorer:");
  console.log(`   ${explorerUrl(mint.toBase58(), "address")}`);
}

main().catch(console.error);
