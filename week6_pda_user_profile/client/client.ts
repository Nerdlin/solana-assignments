import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

// IDL схемы для профиля с PDA
const IDL: any = {
  address: "Prof1Le111111111111111111111111111111111111",
  metadata: {
    name: "user_profile",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "createProfile",
      discriminator: [225, 237, 107, 7, 209, 222, 107, 161],
      accounts: [
        { name: "profile", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "systemProgram", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "username", type: "string" },
        { name: "bio", type: "string" },
        { name: "avatarUrl", type: "string" },
      ],
    },
    {
      name: "updateProfile",
      discriminator: [142, 66, 73, 219, 44, 212, 196, 210],
      accounts: [
        { name: "profile", writable: true },
        { name: "authority", signer: true },
      ],
      args: [
        { name: "newBio", type: "string" },
        { name: "newAvatarUrl", type: "string" },
      ],
    },
    {
      name: "deleteProfile",
      discriminator: [194, 76, 45, 12, 189, 34, 114, 15],
      accounts: [
        { name: "profile", writable: true },
        { name: "authority", writable: true, signer: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "UserProfile",
      discriminator: [111, 237, 246, 222, 23, 111, 99, 45],
    },
  ],
  types: [
    {
      name: "UserProfile",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "username", type: "string" },
          { name: "bio", type: "string" },
          { name: "avatarUrl", type: "string" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
};

async function main() {
  console.log("==========================================================");
  console.log("👤 Decentralized On-Chain Profile with PDA (Devnet)");
  console.log("==========================================================");

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const user = Keypair.generate();
  console.log(`🔑 Кошелек пользователя: ${user.publicKey.toBase58()}`);

  const programIdStr = process.argv[2] || "Prof1Le111111111111111111111111111111111111";
  const programId = new PublicKey(programIdStr);
  IDL.address = programId.toBase58();
  console.log(`📌 Program ID: ${programId.toBase58()}`);

  // Вычисление Program Derived Address (PDA)
  const [profilePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("user-profile"), user.publicKey.toBuffer()],
    programId
  );
  console.log(`🎯 Вычисленный детерминированный PDA адрес: ${profilePda.toBase58()} (bump: ${bump})`);

  const wallet = new anchor.Wallet(user);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(IDL, provider);

  // Запрос аирдропа
  try {
    console.log("\n Запрос тестовых SOL на Devnet...");
    const airdropSig = await connection.requestAirdrop(user.publicKey, 1 * LAMPORTS_PER_SOL);
    const bh = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: airdropSig, ...bh });
    console.log(" Airdrop получен!");
  } catch (e) {
    console.log("⚠️ Airdrop ограничен rate-limit.");
  }

  try {
    console.log("\n1️⃣ Создание профиля через PDA (инструкция createProfile)...");
    const tx = await (program.methods as any)
      .createProfile("alice_dev", "Rust & Solana Enthusiast", "https://solana.com/alice.png")
      .accounts({
        profile: profilePda,
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`   Tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    console.log("\n2️⃣ Чтение ончейн профиля из аккаунта PDA...");
    const profileData: any = await (program.account as any).userProfile.fetch(profilePda);
    console.log("   Данные профиля:", {
      username: profileData.username,
      bio: profileData.bio,
      avatarUrl: profileData.avatarUrl,
      owner: profileData.authority.toBase58(),
    });
  } catch (err: any) {
    console.log("Инструкция готова к вызову:", err.message);
  }
}

main().catch(console.error);
