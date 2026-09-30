import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";

describe("Anchor Counter Tests", () => {
  // Настройка провайдера (подключение к локальной сети или Devnet)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Counter as Program<any>;
  const counterKeypair = anchor.web3.Keypair.generate();

  it("Инициализирует аккаунт счетчика со значением 0", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counterKeypair.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counterKeypair])
      .rpc();

    console.log("  Tx Initialize:", tx);

    const account = await program.account.counter.fetch(counterKeypair.publicKey);
    assert.equal(account.count.toNumber(), 0);
    assert.equal(account.authority.toBase58(), provider.wallet.publicKey.toBase58());
  });

  it("Увеличивает счетчик на +1 (increment)", async () => {
    await program.methods
      .increment()
      .accounts({
        counter: counterKeypair.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counterKeypair.publicKey);
    assert.equal(account.count.toNumber(), 1);
  });

  it("Уменьшает счетчик на -1 (decrement)", async () => {
    await program.methods
      .decrement()
      .accounts({
        counter: counterKeypair.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counterKeypair.publicKey);
    assert.equal(account.count.toNumber(), 0);
  });

  it("Бросает ошибку Underflow при декременте нуля", async () => {
    try {
      await program.methods
        .decrement()
        .accounts({
          counter: counterKeypair.publicKey,
        })
        .rpc();
      assert.fail("Транзакция должна была завершиться с ошибкой Underflow");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Underflow");
      console.log("  [OK] Поймана ожидаемая ошибка Underflow:", err.error.errorMessage);
    }
  });

  it("Устанавливает конкретное значение владельцем (set_value)", async () => {
    await program.methods
      .setValue(new anchor.BN(42))
      .accounts({
        counter: counterKeypair.publicKey,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counterKeypair.publicKey);
    assert.equal(account.count.toNumber(), 42);
  });
});
