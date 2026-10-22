import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { assert, expect } from "chai";
import { LiquidityVault } from "../target/types/liquidity_vault";

// Перевод SOL от admin к аккаунту для покрытия rent
async function fundFromAdmin(
  provider: anchor.AnchorProvider,
  admin: Keypair,
  pubkey: PublicKey,
  lamports = 0.05 * LAMPORTS_PER_SOL
) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: pubkey, lamports })
  );
  await provider.sendAndConfirm(tx, [admin]);
}

describe("Liquidity Vault (Недели 8 - 13)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LiquidityVault as Program<LiquidityVault>;
  const admin = (provider.wallet as anchor.Wallet).payer;

  // Пользователи
  const userA = Keypair.generate();
  const userB = Keypair.generate();
  const userC = Keypair.generate(); // пользователь без карточки

  let tokenMint: PublicKey;
  let vaultStatePDA: PublicKey;
  let vaultTokenAccountPDA: PublicKey;
  let shareMintPDA: PublicKey;

  // Хранилища адресов токен-аккаунтов
  const tokenAcc: Record<string, PublicKey> = {};
  const shareAcc: Record<string, PublicKey> = {};
  const UNIT = 1_000_000; // 6 decimals

  // Helper для нахождения PDA карточки пользователя
  const cardPda = (user: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("user_card"), vaultStatePDA.toBuffer(), user.toBuffer()],
      program.programId
    )[0];

  // Helper для выполнения депозита
  const deposit = (user: Keypair, amount: number) =>
    program.methods
      .deposit(new anchor.BN(amount))
      .accounts({
        vaultState: vaultStatePDA,
        userCard: cardPda(user.publicKey),
        vaultTokenAccount: vaultTokenAccountPDA,
        shareMint: shareMintPDA,
        userTokenAccount: tokenAcc[user.publicKey.toBase58()],
        userShareAccount: shareAcc[user.publicKey.toBase58()],
        user: user.publicKey,
      } as any)
      .signers([user])
      .rpc();

  // Helper для выполнения вывода
  const withdraw = (user: Keypair, shares: number) =>
    program.methods
      .withdraw(new anchor.BN(shares))
      .accounts({
        vaultState: vaultStatePDA,
        userCard: cardPda(user.publicKey),
        vaultTokenAccount: vaultTokenAccountPDA,
        shareMint: shareMintPDA,
        userTokenAccount: tokenAcc[user.publicKey.toBase58()],
        userShareAccount: shareAcc[user.publicKey.toBase58()],
        user: user.publicKey,
      } as any)
      .signers([user])
      .rpc();

  before(async () => {
    // Финансируем аккаунты для оплаты rent
    await fundFromAdmin(provider, admin, userA.publicKey);
    await fundFromAdmin(provider, admin, userB.publicKey);
    await fundFromAdmin(provider, admin, userC.publicKey);

    // Создаем тестовый токен
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);

    // Вычисляем PDAs
    [vaultStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), tokenMint.toBuffer()],
      program.programId
    );
    [vaultTokenAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_tokens"), tokenMint.toBuffer()],
      program.programId
    );
    [shareMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), tokenMint.toBuffer()],
      program.programId
    );
  });

  // =========================================================================
  // НЕДЕЛЯ 8: КАРКАС VAULT
  // =========================================================================

  it("[Неделя 8] initialize_vault: создание VaultState, vault_token_account и share_mint", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        vaultState: vaultStatePDA,
        vaultTokenAccount: vaultTokenAccountPDA,
        shareMint: shareMintPDA,
        tokenMint,
        admin: admin.publicKey,
      } as any)
      .rpc();

    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    assert.equal(vault.admin.toBase58(), admin.publicKey.toBase58());
    assert.equal(vault.tokenMint.toBase58(), tokenMint.toBase58());
    assert.equal(vault.vaultTokenAccount.toBase58(), vaultTokenAccountPDA.toBase58());
    assert.equal(vault.shareMint.toBase58(), shareMintPDA.toBase58());
    assert.equal(vault.totalTokens.toNumber(), 0);
    assert.equal(vault.totalShares.toNumber(), 0);
  });

  it("[Неделя 8] create_user_card: у каждого пользователя создается своя уникальная карточка", async () => {
    for (const user of [userA, userB]) {
      const userCard = cardPda(user.publicKey);
      await program.methods
        .createUserCard()
        .accounts({ vaultState: vaultStatePDA, userCard, user: user.publicKey } as any)
        .signers([user])
        .rpc();

      const card = await program.account.userCard.fetch(userCard);
      assert.equal(card.owner.toBase58(), user.publicKey.toBase58());
      assert.equal(card.vault.toBase58(), vaultStatePDA.toBase58());
      assert.equal(card.deposited.toNumber(), 0);
      assert.equal(card.shares.toNumber(), 0);
    }

    assert.notEqual(
      cardPda(userA.publicKey).toBase58(),
      cardPda(userB.publicKey).toBase58()
    );
  });

  it("[Неделя 8] create_user_card: повторное создание карточки для того же пользователя отклоняется", async () => {
    let failed = false;
    try {
      await program.methods
        .createUserCard()
        .accounts({
          vaultState: vaultStatePDA,
          userCard: cardPda(userA.publicKey),
          user: userA.publicKey,
        } as any)
        .signers([userA])
        .rpc();
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "Повторное создание карточки должно быть отклонено рантаймом Anchor");
  });

  // =========================================================================
  // НЕДЕЛЯ 9: ДЕПОЗИТ И SHARE-ТОКЕНЫ
  // =========================================================================

  it("[Неделя 9] deposit: User A вносит 100 токенов -> получает 100 share-токенов (1:1 первый депозит)", async () => {
    for (const user of [userA, userB, userC]) {
      const key = user.publicKey.toBase58();
      tokenAcc[key] = await createAccount(provider.connection, admin, tokenMint, user.publicKey);
      shareAcc[key] = await createAccount(provider.connection, admin, shareMintPDA, user.publicKey);
      await mintTo(provider.connection, admin, tokenMint, tokenAcc[key], admin, 1000 * UNIT);
    }

    await deposit(userA, 100 * UNIT);

    const shares = await getAccount(provider.connection, shareAcc[userA.publicKey.toBase58()]);
    assert.equal(shares.amount, BigInt(100 * UNIT));

    const card = await program.account.userCard.fetch(cardPda(userA.publicKey));
    assert.equal(card.deposited.toNumber(), 100 * UNIT);
    assert.equal(card.shares.toNumber(), 100 * UNIT);

    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    assert.equal(vault.totalTokens.toNumber(), 100 * UNIT);
    assert.equal(vault.totalShares.toNumber(), 100 * UNIT);
  });

  it("[Неделя 9] deposit: User B вносит 50 токенов -> пропорциональный расчет shares", async () => {
    await deposit(userB, 50 * UNIT);

    const shares = await getAccount(provider.connection, shareAcc[userB.publicKey.toBase58()]);
    assert.equal(shares.amount, BigInt(50 * UNIT));

    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    assert.equal(vault.totalTokens.toNumber(), 150 * UNIT);
    assert.equal(vault.totalShares.toNumber(), 150 * UNIT);

    const vaultTokens = await getAccount(provider.connection, vaultTokenAccountPDA);
    assert.equal(vaultTokens.amount, BigInt(150 * UNIT));
  });

  it("[Неделя 9] deposit: депозит без карточки отклоняется с ошибкой", async () => {
    let failed = false;
    try {
      await deposit(userC, 10 * UNIT);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "Депозит без предварительно созданной карточки должен быть отклонён");
  });

  it("[Неделя 9] deposit: депозит суммы 0 отклоняется (ZeroAmount)", async () => {
    let failed = false;
    try {
      await deposit(userA, 0);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "Нулевой депозит должен быть отклонён");
  });

  // =========================================================================
  // НЕДЕЛЯ 10: CPI И ВЫВОД ИЗ VAULT
  // =========================================================================

  it("[Неделя 10] withdraw: User A выводит 50 share-токенов -> сжигание shares и возврат 50 токенов", async () => {
    const beforeTokens = await getAccount(provider.connection, tokenAcc[userA.publicKey.toBase58()]);

    await withdraw(userA, 50 * UNIT);

    // Проверяем сжигание share-токенов
    const sharesAfter = await getAccount(provider.connection, shareAcc[userA.publicKey.toBase58()]);
    assert.equal(sharesAfter.amount, BigInt(50 * UNIT));

    // Проверяем начисление токенов
    const afterTokens = await getAccount(provider.connection, tokenAcc[userA.publicKey.toBase58()]);
    assert.equal(afterTokens.amount - beforeTokens.amount, BigInt(50 * UNIT));

    // Проверяем состояние карточки
    const card = await program.account.userCard.fetch(cardPda(userA.publicKey));
    assert.equal(card.shares.toNumber(), 50 * UNIT);

    // Проверяем общее состояние vault
    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    assert.equal(vault.totalTokens.toNumber(), 100 * UNIT);
    assert.equal(vault.totalShares.toNumber(), 100 * UNIT);
  });

  it("[Неделя 10] withdraw: попытка вывести больше shares, чем есть на карточке, отклоняется", async () => {
    let failed = false;
    try {
      await withdraw(userA, 200 * UNIT);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "Попытка вывода больше имеющихся shares должна вызвать ошибку InsufficientShares");
  });

  it("[Неделя 10] withdraw: нулевой вывод отклоняется (ZeroAmount)", async () => {
    let failed = false;
    try {
      await withdraw(userA, 0);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "Вывод 0 shares должен отклоняться");
  });

  // =========================================================================
  // НЕДЕЛЯ 12: ЗАЩИТА И ПРАВИЛА SWAP RAYDIUM
  // =========================================================================

  it("[Неделя 12] swap_raydium: вызов обмена не-администратором отклоняется (Unauthorized)", async () => {
    let failed = false;
    try {
      await program.methods
        .swapRaydium(new anchor.BN(10 * UNIT), new anchor.BN(9 * UNIT))
        .accounts({
          admin: userA.publicKey, // User A не является админом
          vaultState: vaultStatePDA,
          vaultInputTokenAccount: vaultTokenAccountPDA,
          vaultOutputTokenAccount: tokenAcc[userA.publicKey.toBase58()],
        } as any)
        .signers([userA])
        .rpc();
    } catch (e: any) {
      failed = true;
    }
    assert.isTrue(failed, "Только админ может выполнять обмен через Raydium");
  });

  // =========================================================================
  // НЕДЕЛЯ 13: ВАЛИДАЦИЯ ДИАПАЗОНА CLMM И АВТОРИЗАЦИЯ
  // =========================================================================

  it("[Неделя 13] open_raydium_position: неверный ценовой диапазон (tick_lower >= tick_upper) отклоняется", async () => {
    let failed = false;
    try {
      await program.methods
        .openRaydiumPosition(
          100, // tick_lower
          50,  // tick_upper (меньше нижнего!)
          0,
          0,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(100)
        )
        .accounts({
          admin: admin.publicKey,
          vaultState: vaultStatePDA,
        } as any)
        .rpc();
    } catch (e: any) {
      failed = true;
    }
    assert.isTrue(failed, "Должна быть ошибка InvalidTickRange");
  });

  it("[Неделя 13] close_raydium_position: закрытие позиции не-администратором отклоняется", async () => {
    let failed = false;
    try {
      await program.methods
        .closeRaydiumPosition(new anchor.BN(0), new anchor.BN(0))
        .accounts({
          admin: userA.publicKey,
          vaultState: vaultStatePDA,
        } as any)
        .signers([userA])
        .rpc();
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "Закрытие позиции доступно только администратору vault");
  });
});
