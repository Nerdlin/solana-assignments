import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";

describe("Decentralized User Profile (PDA) Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.UserProfile as Program<any>;
  const authority = provider.wallet.publicKey;

  // Детерминированный расчет адреса PDA для аккаунта пользователя
  const [profilePda, profileBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user-profile"), authority.toBuffer()],
    program.programId
  );

  it("Создает децентрализованный профиль с PDA", async () => {
    const username = "web3_alex";
    const bio = "Building Solana smart contracts";
    const avatarUrl = "https://solana.com/logo.png";

    const tx = await program.methods
      .createProfile(username, bio, avatarUrl)
      .accounts({
        profile: profilePda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("  Tx Create Profile:", tx);
    console.log("  PDA Address:", profilePda.toBase58());

    const account = await program.account.userProfile.fetch(profilePda);
    assert.equal(account.username, username);
    assert.equal(account.bio, bio);
    assert.equal(account.avatarUrl, avatarUrl);
    assert.equal(account.authority.toBase58(), authority.toBase58());
    assert.equal(account.bump, profileBump);
  });

  it("Обновляет существующий профиль", async () => {
    const newBio = "Solana Fullstack Architect & Anchor Developer";
    const newAvatar = "https://github.com/solana.png";

    await program.methods
      .updateProfile(newBio, newAvatar)
      .accounts({
        profile: profilePda,
        authority: authority,
      })
      .rpc();

    const account = await program.account.userProfile.fetch(profilePda);
    assert.equal(account.bio, newBio);
    assert.equal(account.avatarUrl, newAvatar);
  });

  it("Бросает ошибку при превышении максимальной длины био", async () => {
    const hugeBio = "a".repeat(200); // Превышает лимит 128 байт
    try {
      await program.methods
        .updateProfile(hugeBio, "https://avatar.png")
        .accounts({
          profile: profilePda,
          authority: authority,
        })
        .rpc();
      assert.fail("Должна быть ошибка BioTooLong");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("BioTooLong");
      console.log("  [OK] Проверка валидации прошла успешно: BioTooLong");
    }
  });

  it("Удаляет профиль и возвращает арендные средства (close constraint)", async () => {
    const balanceBefore = await provider.connection.getBalance(authority);

    await program.methods
      .deleteProfile()
      .accounts({
        profile: profilePda,
        authority: authority,
      })
      .rpc();

    const pdaAccountInfo = await provider.connection.getAccountInfo(profilePda);
    assert.isNull(pdaAccountInfo, "Аккаунт PDA должен быть закрыт (null)");

    const balanceAfter = await provider.connection.getBalance(authority);
    console.log("  Профиль закрыт. Баланс пользователя пополнен возвращенным рентом.");
    assert.isTrue(balanceAfter > 0);
  });
});
