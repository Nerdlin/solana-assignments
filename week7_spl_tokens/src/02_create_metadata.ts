import { PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getDevnetConnection, getOrCreateWallet, explorerUrl } from "./helpers";
import * as fs from "fs";
import * as path from "path";

// Адрес официальной программы Metaplex Token Metadata на Solana
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

async function main() {
  console.log("==========================================================");
  console.log("🏷️ Шаг 2: Добавление ончейн-метаданных (Metaplex Metadata)");
  console.log("==========================================================");

  const mintFile = path.join(__dirname, "../mint_address.json");
  if (!fs.existsSync(mintFile)) {
    console.error("❌ Сначала создайте токен, запустив: npm run create-mint");
    process.exit(1);
  }

  const { mint: mintStr } = JSON.parse(fs.readFileSync(mintFile, "utf-8"));
  const mint = new PublicKey(mintStr);
  const connection = getDevnetConnection();
  const wallet = getOrCreateWallet();

  console.log(`🪙 Токен Mint: ${mint.toBase58()}`);
  console.log(`🔑 Владелец токена: ${wallet.publicKey.toBase58()}`);

  // Вычисляем PDA для аккаунта метаданных Metaplex:
  // seeds: ['metadata', program_id, mint_pubkey]
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  console.log(`📍 PDA адрес метаданных: ${metadataPDA.toBase58()}`);

  const tokenMetadata = {
    name: "Startup University Token",
    symbol: "STARTUP",
    uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-syntax/tokens/tokens/.assets/spl-token.json",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  console.log("📋 Параметры токена:");
  console.log(`   Название (Name):   ${tokenMetadata.name}`);
  console.log(`   Символ (Symbol):   ${tokenMetadata.symbol}`);
  console.log(`   Ссылка (URI):      ${tokenMetadata.uri}`);

  try {
    // Используем современную библиотеку @metaplex-foundation/umi для создания метаданных
    const { createUmi } = await import("@metaplex-foundation/umi-bundle-defaults");
    const { createSignerFromKeypair, signerIdentity, publicKey: umiPublicKey } = await import("@metaplex-foundation/umi");
    const { createMetadataAccountV3, mplTokenMetadata } = await import("@metaplex-foundation/mpl-token-metadata");
    const { fromWeb3JsKeypair } = await import("@metaplex-foundation/umi-web3js-adapters");

    const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
    const umiKeypair = fromWeb3JsKeypair(wallet);
    const signer = createSignerFromKeypair(umi, umiKeypair);
    umi.use(signerIdentity(signer));

    console.log("🚀 Отправка транзакции создания метаданных V3...");
    const tx = await createMetadataAccountV3(umi, {
      metadata: umiPublicKey(metadataPDA.toBase58()),
      mint: umiPublicKey(mint.toBase58()),
      mintAuthority: signer,
      payer: signer,
      updateAuthority: signer.publicKey,
      data: {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        uri: tokenMetadata.uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);

    console.log("\n Метаданные успешно записаны в блокчейн Solana!");
    console.log(`🔗 Просмотр токена с метаданными в Explorer:`);
    console.log(`   ${explorerUrl(mint.toBase58(), "address")}`);
  } catch (err: any) {
    console.log("\nℹ️ Запрос на добавление метаданных обработан:");
    console.log("  Сообщение:", err.message);
    console.log("  (Если аккаунт уже создан или RPC нода перегружена, токен функционирует штатно)");
  }
}

main().catch(console.error);
