import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MinimalDebatePool, MockERC20 } from "../typechain-types";
import { EIP712Signer } from "./utils/eip712";

// Helper for anyValue matcher
const anyValue = () => true;

describe("MinimalDebatePool", function () {
  let minimalDebatePool: MinimalDebatePool;
  let mockUSDC: MockERC20;
  let owner: SignerWithAddress;
  let oracle: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const ENTRY_FEE = ethers.parseUnits("1", 6); // 1 USDC (6 decimals)
  const DEBATE_ID = 1;

  beforeEach(async function () {
    [owner, oracle, user1, user2, user3] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to users
    await mockUSDC.mint(user1.address, ethers.parseUnits("100", 6));
    await mockUSDC.mint(user2.address, ethers.parseUnits("100", 6));
    await mockUSDC.mint(user3.address, ethers.parseUnits("100", 6));

    // Deploy MinimalDebatePool
    const MinimalDebatePoolFactory = await ethers.getContractFactory("MinimalDebatePool");
    minimalDebatePool = await MinimalDebatePoolFactory.deploy(
      await mockUSDC.getAddress(),
      oracle.address
    );
    await minimalDebatePool.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct USDC token address", async function () {
      expect(await minimalDebatePool.usdcToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should set the correct oracle address", async function () {
      expect(await minimalDebatePool.oracle()).to.equal(oracle.address);
    });

    it("Should set the correct owner", async function () {
      expect(await minimalDebatePool.owner()).to.equal(owner.address);
    });

    it("Should initialize as not paused", async function () {
      expect(await minimalDebatePool.paused()).to.be.false;
    });
  });

  describe("User Payments (Direct Transfer)", function () {
    it("Should accept USDC transfers from users", async function () {
      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      
      const balance = await mockUSDC.balanceOf(await minimalDebatePool.getAddress());
      expect(balance).to.equal(ENTRY_FEE);
    });

    it("Should accumulate multiple user payments", async function () {
      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      await mockUSDC.connect(user2).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      await mockUSDC.connect(user3).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      
      const balance = await mockUSDC.balanceOf(await minimalDebatePool.getAddress());
      expect(balance).to.equal(ENTRY_FEE * BigInt(3));
    });
  });

  describe("Winner Distribution", function () {
    beforeEach(async function () {
      // Simulate users paying
      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      await mockUSDC.connect(user2).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
    });

    it("Should distribute winner prize with valid signature", async function () {
      const totalCollected = ENTRY_FEE * BigInt(2); // 2 USDC
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100); // 80% = 1.6 USDC

      // Create EIP-712 signature
      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      // Check initial balances
      const contractBalanceBefore = await mockUSDC.balanceOf(await minimalDebatePool.getAddress());
      const winnerBalanceBefore = await mockUSDC.balanceOf(user1.address);

      // Distribute winner prize
      const tx = await minimalDebatePool.connect(oracle).distributeWinner(
        DEBATE_ID,
        user1.address,
        winnerPrize,
        signature
      );

      await expect(tx)
        .to.emit(minimalDebatePool, "WinnerDistributed")
        .withArgs(DEBATE_ID, user1.address, winnerPrize, (value: bigint) => value > 0);

      // Check balances after
      const contractBalanceAfter = await mockUSDC.balanceOf(await minimalDebatePool.getAddress());
      const winnerBalanceAfter = await mockUSDC.balanceOf(user1.address);

      expect(winnerBalanceAfter - winnerBalanceBefore).to.equal(winnerPrize);
      expect(contractBalanceBefore - contractBalanceAfter).to.equal(winnerPrize);
    });

    it("Should mark debate as completed after distribution", async function () {
      const totalCollected = ENTRY_FEE * BigInt(2);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await minimalDebatePool.connect(oracle).distributeWinner(
        DEBATE_ID,
        user1.address,
        winnerPrize,
        signature
      );

      expect(await minimalDebatePool.isDebateCompleted(DEBATE_ID)).to.be.true;
      expect(await minimalDebatePool.completedDebates(DEBATE_ID)).to.be.true;
    });

    it("Should reject distribution with invalid signature", async function () {
      const totalCollected = ENTRY_FEE * BigInt(2);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      // Use wrong signer
      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        user1, // Wrong signer (not oracle)
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await expect(
        minimalDebatePool.connect(oracle).distributeWinner(
          DEBATE_ID,
          user1.address,
          winnerPrize,
          signature
        )
      ).to.be.revertedWith("MinimalDebatePool: Invalid signature");
    });

    it("Should reject distribution from non-oracle", async function () {
      const totalCollected = ENTRY_FEE * BigInt(2);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await expect(
        minimalDebatePool.connect(user1).distributeWinner(
          DEBATE_ID,
          user1.address,
          winnerPrize,
          signature
        )
      ).to.be.revertedWith("MinimalDebatePool: Not oracle");
    });

    it("Should reject double distribution", async function () {
      const totalCollected = ENTRY_FEE * BigInt(2);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      // First distribution
      await minimalDebatePool.connect(oracle).distributeWinner(
        DEBATE_ID,
        user1.address,
        winnerPrize,
        signature
      );

      // Try second distribution
      await expect(
        minimalDebatePool.connect(oracle).distributeWinner(
          DEBATE_ID,
          user2.address,
          winnerPrize,
          signature
        )
      ).to.be.revertedWith("MinimalDebatePool: Already completed");
    });

    it("Should reject distribution when paused", async function () {
      await minimalDebatePool.connect(owner).togglePause();

      const totalCollected = ENTRY_FEE * BigInt(2);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await expect(
        minimalDebatePool.connect(oracle).distributeWinner(
          DEBATE_ID,
          user1.address,
          winnerPrize,
          signature
        )
      ).to.be.revertedWith("MinimalDebatePool: Contract paused");
    });
  });

  describe("Platform Fee Withdrawal", function () {
    beforeEach(async function () {
      // Users pay
      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      await mockUSDC.connect(user2).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);

      // Distribute winner (80% goes to winner, 20% stays as platform fee)
      const totalCollected = ENTRY_FEE * BigInt(2);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await minimalDebatePool.connect(oracle).distributeWinner(
        DEBATE_ID,
        user1.address,
        winnerPrize,
        signature
      );
    });

    it("Should allow owner to withdraw platform fees", async function () {
      const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
      
      // Get platform fees for this debate (should be winnerPrize / 4)
      const expectedPlatformFee = await minimalDebatePool.platformFees(DEBATE_ID);
      expect(expectedPlatformFee).to.be.gt(0);

      await expect(minimalDebatePool.connect(owner).withdrawDebateFees(DEBATE_ID))
        .to.emit(minimalDebatePool, "FeesWithdrawn")
        .withArgs(owner.address, expectedPlatformFee);

      const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedPlatformFee);
      
      // Verify fees were cleared
      expect(await minimalDebatePool.platformFees(DEBATE_ID)).to.equal(0);
      
      // Contract should still have winner prize (which was already withdrawn)
      // Actually, winner prize was already transferred, so remaining balance should be platform fee
      // But platform fee was just withdrawn, so balance should be 0
      const remainingBalance = await mockUSDC.balanceOf(await minimalDebatePool.getAddress());
      // There might be some precision loss, but should be approximately 0
      expect(remainingBalance).to.equal(0);
    });

    it("Should reject withdrawal from non-owner", async function () {
      await expect(
        minimalDebatePool.connect(user1).withdrawDebateFees(DEBATE_ID)
      ).to.be.revertedWithCustomError(minimalDebatePool, "OwnableUnauthorizedAccount");
    });

    it("Should reject withdrawal when no fees", async function () {
      // Withdraw once
      await minimalDebatePool.connect(owner).withdrawDebateFees(DEBATE_ID);

      // Try to withdraw again (fees cleared)
      await expect(
        minimalDebatePool.connect(owner).withdrawDebateFees(DEBATE_ID)
      ).to.be.revertedWith("MinimalDebatePool: No fees for this debate");
    });

    it("Should reject withdrawal for incomplete debate", async function () {
      // Try to withdraw fees for a debate that hasn't been completed
      await expect(
        minimalDebatePool.connect(owner).withdrawDebateFees(DEBATE_ID + 1)
      ).to.be.revertedWith("MinimalDebatePool: Debate not completed");
    });
  });

  describe("Pause Mechanism", function () {
    it("Should allow owner to toggle pause", async function () {
      expect(await minimalDebatePool.paused()).to.be.false;

      await expect(minimalDebatePool.connect(owner).togglePause())
        .to.emit(minimalDebatePool, "PauseToggled")
        .withArgs(true);

      expect(await minimalDebatePool.paused()).to.be.true;

      await expect(minimalDebatePool.connect(owner).togglePause())
        .to.emit(minimalDebatePool, "PauseToggled")
        .withArgs(false);

      expect(await minimalDebatePool.paused()).to.be.false;
    });

    it("Should reject pause toggle from non-owner", async function () {
      await expect(
        minimalDebatePool.connect(user1).togglePause()
      ).to.be.revertedWithCustomError(minimalDebatePool, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause specific debate", async function () {
      await expect(minimalDebatePool.connect(owner).pauseDebate(DEBATE_ID))
        .to.emit(minimalDebatePool, "DebatePaused")
        .withArgs(DEBATE_ID);

      expect(await minimalDebatePool.pausedDebates(DEBATE_ID)).to.be.true;
    });

    it("Should allow owner to unpause specific debate", async function () {
      await minimalDebatePool.connect(owner).pauseDebate(DEBATE_ID);
      await minimalDebatePool.connect(owner).unpauseDebate(DEBATE_ID);

      expect(await minimalDebatePool.pausedDebates(DEBATE_ID)).to.be.false;
    });

    it("Should reject distribution for paused debate", async function () {
      await minimalDebatePool.connect(owner).pauseDebate(DEBATE_ID);

      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);

      const totalCollected = ENTRY_FEE;
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await expect(
        minimalDebatePool.connect(oracle).distributeWinner(
          DEBATE_ID,
          user1.address,
          winnerPrize,
          signature
        )
      ).to.be.revertedWith("MinimalDebatePool: Debate paused");
    });
  });

  describe("Refund Functions", function () {
    beforeEach(async function () {
      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      await mockUSDC.connect(user2).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      await mockUSDC.connect(user3).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
    });

    it("Should process refund with valid signature", async function () {
      const recipients = [user1.address, user2.address];
      const refundAmount = ENTRY_FEE;

      // Create message hash exactly as contract does: keccak256(abi.encode(debateId, recipients, refundAmount))
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address[]", "uint256"],
          [DEBATE_ID, recipients, refundAmount]
        )
      );
      
      // Contract uses _hashTypedDataV4(messageHash) which wraps messageHash with EIP-712 domain separator
      // _hashTypedDataV4 does: keccak256("\x19\x01" || domainSeparator || messageHash)
      // where domainSeparator = keccak256(abi.encode(TYPE_HASH, hashedName, hashedVersion, chainId, address))
      const network = await ethers.provider.getNetwork();
      const chainId = network.chainId;
      const contractAddress = await minimalDebatePool.getAddress();
      
      // Calculate domain separator exactly as OpenZeppelin does
      const EIP712_DOMAIN_TYPEHASH = ethers.keccak256(
        ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
      );
      
      const hashedName = ethers.keccak256(ethers.toUtf8Bytes("MinimalDebatePool"));
      const hashedVersion = ethers.keccak256(ethers.toUtf8Bytes("1"));
      
      // Domain separator: keccak256(abi.encode(TYPE_HASH, hashedName, hashedVersion, chainId, address))
      const domainSeparator = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [EIP712_DOMAIN_TYPEHASH, hashedName, hashedVersion, chainId, contractAddress]
        )
      );
      
      // Final hash: keccak256("\x19\x01" || domainSeparator || messageHash)
      // This matches what _hashTypedDataV4 does when passed messageHash as structHash
      const hashToSign = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "bytes32", "bytes32"],
          ["\x19\x01", domainSeparator, messageHash]
        )
      );
      
      // Sign the raw hash directly without Ethereum message prefix
      // Hardhat signers don't expose private keys easily, but we can use a workaround:
      // Use signMessage and then manually extract/adjust, OR
      // Get private key from Hardhat's deterministic accounts
      // Hardhat uses: m/44'/60'/0'/0/index where index is signer position
      // Accounts are: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 (index 0)
      //               0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d (index 1 = oracle)
      
      // Get oracle's index (should be 1 based on beforeEach setup)
      const accounts = await ethers.provider.send("eth_accounts", []);
      const oracleIndex = accounts.indexOf(oracle.address);
      
      // Hardhat's default private keys for first 20 accounts
      const hardhatPrivateKeys = [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      ];
      
      const oraclePrivateKey = hardhatPrivateKeys[oracleIndex] || hardhatPrivateKeys[1]; // Default to index 1
      const wallet = new ethers.Wallet(oraclePrivateKey);
      const signingKey = new ethers.SigningKey(wallet.privateKey);
      const sig = signingKey.sign(hashToSign);
      const signature = ethers.Signature.from(sig).serialized;

      const user1BalanceBefore = await mockUSDC.balanceOf(user1.address);
      const user2BalanceBefore = await mockUSDC.balanceOf(user2.address);

      await expect(
        minimalDebatePool.connect(oracle).processRefund(
          DEBATE_ID,
          recipients,
          refundAmount,
          signature
        )
      )
        .to.emit(minimalDebatePool, "RefundProcessed")
        .withArgs(DEBATE_ID, user1.address, refundAmount)
        .and.to.emit(minimalDebatePool, "RefundProcessed")
        .withArgs(DEBATE_ID, user2.address, refundAmount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1BalanceBefore + refundAmount);
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(user2BalanceBefore + refundAmount);
    });

    it("Should allow owner to emergency refund", async function () {
      const recipients = [user1.address, user2.address];
      const refundAmount = ENTRY_FEE;

      const user1BalanceBefore = await mockUSDC.balanceOf(user1.address);
      const user2BalanceBefore = await mockUSDC.balanceOf(user2.address);

      await expect(
        minimalDebatePool.connect(owner).emergencyRefund(
          DEBATE_ID,
          recipients,
          refundAmount
        )
      )
        .to.emit(minimalDebatePool, "EmergencyRefundProcessed")
        .withArgs(DEBATE_ID, user1.address, refundAmount)
        .and.to.emit(minimalDebatePool, "EmergencyRefundProcessed")
        .withArgs(DEBATE_ID, user2.address, refundAmount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1BalanceBefore + refundAmount);
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(user2BalanceBefore + refundAmount);
    });

    it("Should reject refund after debate is completed", async function () {
      // Complete debate first
      const totalCollected = ENTRY_FEE * BigInt(3);
      const winnerPrize = (totalCollected * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await minimalDebatePool.connect(oracle).distributeWinner(
        DEBATE_ID,
        user1.address,
        winnerPrize,
        signature
      );

      // Try refund
      const recipients = [user2.address];
      const refundAmount = ENTRY_FEE;
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address[]", "uint256"],
          [DEBATE_ID, recipients, refundAmount]
        )
      );
      const refundSignature = await signer.signMessage(oracle, messageHash);

      await expect(
        minimalDebatePool.connect(oracle).processRefund(
          DEBATE_ID,
          recipients,
          refundAmount,
          refundSignature
        )
      ).to.be.revertedWith("MinimalDebatePool: Already completed");
    });
  });

  describe("View Functions", function () {
    it("Should return correct contract balance", async function () {
      expect(await minimalDebatePool.getContractBalance()).to.equal(0);

      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      expect(await minimalDebatePool.getContractBalance()).to.equal(ENTRY_FEE);
    });

    it("Should return correct completion status", async function () {
      expect(await minimalDebatePool.isDebateCompleted(DEBATE_ID)).to.be.false;

      await mockUSDC.connect(user1).transfer(await minimalDebatePool.getAddress(), ENTRY_FEE);
      const winnerPrize = (ENTRY_FEE * BigInt(80)) / BigInt(100);

      const signer = new EIP712Signer(
        await minimalDebatePool.getAddress(),
        "MinimalDebatePool",
        "1"
      );
      const signature = await signer.signWinnerDistribution(
        oracle,
        DEBATE_ID,
        user1.address,
        winnerPrize
      );

      await minimalDebatePool.connect(oracle).distributeWinner(
        DEBATE_ID,
        user1.address,
        winnerPrize,
        signature
      );

      expect(await minimalDebatePool.isDebateCompleted(DEBATE_ID)).to.be.true;
    });
  });
});

