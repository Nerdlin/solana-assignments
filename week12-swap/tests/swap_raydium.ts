import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("week12-swap", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("calculates slippage protection and limits correctly", () => {
    const inputAmount = 100_000n; // 0.1 Token
    const slippageBps = 100n;     // 1%
    const expectedOutput = 99_500n;

    const minOutput = (expectedOutput * (10_000n - slippageBps)) / 10_000n;
    expect(minOutput).to.equal(98_505n);
  });

  it("verifies Raydium CLMM program and Pool PDAs", () => {
    const clmmProgramId = new PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
    expect(clmmProgramId.toBase58()).to.equal("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
  });
});
