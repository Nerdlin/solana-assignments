import { createMint } from "@solana/spl-token";
import { getDevnetConnection, getOrCreateWallet, ensureAirdrop, explorerUrl } from "./helpers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================================");
  console.log("🪙 Шаг 1: Создание аккаунта нового токена (Token Mint)");
  console.log("==========================================================");

  const connection = getDevnetConnection();
  const wallet = getOrCreateWallet();
  console.log(`🔑 Кошелек создателя: ${wallet.publicKey.toBase58()}`);

  await ensureAirdrop(connection, wallet, 1);

  const decimals = 9; // Стандартное число десятичных знаков как у SOL
  console.log(` Создание Mint с ${decimals} знаками после запятой (Decimals)...`);

  // Создаем аккаунт минта в блокчейне Solana
  const mint = await createMint(
    connection,
    wallet,              // Плательщик комиссии за создание аккаунта
    wallet.publicKey,    // mintAuthority (кто имеет право печатать токены)
    wallet.publicKey,    // freezeAuthority (кто имеет право замораживать токены)
    decimals             // Количество знаков после запятой
  );

  console.log(`\n🎉 Токен успешно создан!`);
  console.log(`📍 Адрес Mint (Token ID): ${mint.toBase58()}`);
  console.log(`🔗 Просмотр токена в Solana Explorer:`);
  console.log(`   ${explorerUrl(mint.toBase58(), "address")}`);

  // Сохраняем адрес минта в файл для последующих шагов
  fs.writeFileSync(
    path.join(__dirname, "../mint_address.json"),
    JSON.stringify({ mint: mint.toBase58(), decimals })
  );
  console.log("💾 Адрес сохранен в mint_address.json");
}

main().catch(console.error);
