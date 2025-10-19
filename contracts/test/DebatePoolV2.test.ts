import { expect } from "chai";
import { ethers } from "hardhat";
import { DebatePoolV2 } from "../typechain-types/contracts/DebatePoolV2";
import { MockERC20 } from "../typechain-types/contracts/MockERC20";

describe("DebatePoolV2", function () {
    let debatePool: DebatePoolV2;
    let usdcToken: MockERC20;
    let owner: any;
    let oracle: any;
    let user1: any;
    let user2: any;
    let user3: any;

    const ENTRY_FEE = ethers.parseUnits("1", 6); // 1 USDC (6 decimals)
    const MAX_PARTICIPANTS = 10;
    const DURATION = 3600; // 1 hour

    beforeEach(async function () {
        [owner, oracle, user1, user2, user3] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        usdcToken = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
        await usdcToken.waitForDeployment();

        // Deploy DebatePoolV2
        const DebatePoolV2Factory = await ethers.getContractFactory("DebatePoolV2");
        debatePool = await DebatePoolV2Factory.deploy(
            await usdcToken.getAddress(),
            oracle.address
        );
        await debatePool.waitForDeployment();

        // Mint USDC to users
        await usdcToken.mint(user1.address, ethers.parseUnits("100", 6));
        await usdcToken.mint(user2.address, ethers.parseUnits("100", 6));
        await usdcToken.mint(user3.address, ethers.parseUnits("100", 6));

        // Approve USDC spending
        await usdcToken.connect(user1).approve(await debatePool.getAddress(), ethers.parseUnits("100", 6));
        await usdcToken.connect(user2).approve(await debatePool.getAddress(), ethers.parseUnits("100", 6));
        await usdcToken.connect(user3).approve(await debatePool.getAddress(), ethers.parseUnits("100", 6));
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await debatePool.owner()).to.equal(owner.address);
        });

        it("Should set the correct oracle", async function () {
            expect(await debatePool.oracle()).to.equal(oracle.address);
        });

        it("Should set the correct USDC token", async function () {
            expect(await debatePool.usdcToken()).to.equal(await usdcToken.getAddress());
        });

        it("Should initialize with correct constants", async function () {
            expect(await debatePool.PLATFORM_FEE_PERCENTAGE()).to.equal(20);
            expect(await debatePool.REFUND_PERIOD()).to.equal(7 * 24 * 3600); // 7 days
            expect(await debatePool.TIMEOUT_PERIOD()).to.equal(24 * 3600); // 24 hours
            expect(await debatePool.DEBATE_PARTICIPATION_POINTS()).to.equal(100);
            expect(await debatePool.DEBATE_WINNER_POINTS()).to.equal(1000);
            expect(await debatePool.LIKE_POINTS()).to.equal(10);
            expect(await debatePool.SHARE_POINTS()).to.equal(10);
        });
    });

    describe("Debate Creation", function () {
        it("Should create a debate successfully", async function () {
            const tx = await debatePool.connect(oracle).createDebate(
                "Test Debate Topic",
                ENTRY_FEE,
                MAX_PARTICIPANTS,
                DURATION
            );

            await expect(tx)
                .to.emit(debatePool, "DebateCreated")
                .withArgs(1, "Test Debate Topic", ENTRY_FEE);

            const debate = await debatePool.getDebate(1);
            expect(debate.topic).to.equal("Test Debate Topic");
            expect(debate.entryFee).to.equal(ENTRY_FEE);
            expect(debate.maxParticipants).to.equal(MAX_PARTICIPANTS);
            expect(debate.isActive).to.be.true;
            expect(debate.isCompleted).to.be.false;
        });

        it("Should only allow oracle to create debates", async function () {
            await expect(
                debatePool.connect(user1).createDebate(
                    "Test Debate Topic",
                    ENTRY_FEE,
                    MAX_PARTICIPANTS,
                    DURATION
                )
            ).to.be.revertedWith("DebatePoolV2: Only oracle can call this function");
        });

        it("Should reject empty topic", async function () {
            await expect(
                debatePool.connect(oracle).createDebate("", ENTRY_FEE, MAX_PARTICIPANTS, DURATION)
            ).to.be.revertedWith("DebatePoolV2: Topic cannot be empty");
        });

        it("Should reject zero entry fee", async function () {
            await expect(
                debatePool.connect(oracle).createDebate("Test", 0, MAX_PARTICIPANTS, DURATION)
            ).to.be.revertedWith("DebatePoolV2: Entry fee must be greater than 0");
        });

        it("Should reject max participants less than 2", async function () {
            await expect(
                debatePool.connect(oracle).createDebate("Test", ENTRY_FEE, 1, DURATION)
            ).to.be.revertedWith("DebatePoolV2: Must allow at least 2 participants");
        });
    });

    describe("Joining Debates", function () {
        beforeEach(async function () {
            await debatePool.connect(oracle).createDebate(
                "Test Debate Topic",
                ENTRY_FEE,
                MAX_PARTICIPANTS,
                DURATION
            );
        });

        it("Should allow users to join debates", async function () {
            const tx = await debatePool.connect(user1).joinDebate(1);

            await expect(tx)
                .to.emit(debatePool, "ParticipantJoined")
                .withArgs(1, user1.address);

            await expect(tx)
                .to.emit(debatePool, "PointsAwarded")
                .withArgs(user1.address, 100, "debate_participation");

            const debate = await debatePool.getDebate(1);
            expect(debate.participants.length).to.equal(1);
            expect(debate.participants[0]).to.equal(user1.address);

            const userPoints = await debatePool.getUserPoints(user1.address);
            expect(userPoints).to.equal(100);
        });

        it("Should prevent joining expired debates", async function () {
            // Fast forward time to after debate ends
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                debatePool.connect(user1).joinDebate(1)
            ).to.be.revertedWith("DebatePoolV2: Debate has ended");
        });

        it("Should prevent joining full debates", async function () {
            // Create debate with max 2 participants
            await debatePool.connect(oracle).createDebate("Small Debate", ENTRY_FEE, 2, DURATION);

            // Join with 2 users
            await debatePool.connect(user1).joinDebate(2);
            await debatePool.connect(user2).joinDebate(2);

            // Third user should fail
            await expect(
                debatePool.connect(user3).joinDebate(2)
            ).to.be.revertedWith("DebatePoolV2: Debate is full");
        });

        it("Should prevent joining same debate twice", async function () {
            await debatePool.connect(user1).joinDebate(1);

            await expect(
                debatePool.connect(user1).joinDebate(1)
            ).to.be.revertedWith("DebatePoolV2: Already participating");
        });
    });

    describe("Winner Declaration", function () {
        beforeEach(async function () {
            await debatePool.connect(oracle).createDebate(
                "Test Debate Topic",
                ENTRY_FEE,
                MAX_PARTICIPANTS,
                DURATION
            );
            await debatePool.connect(user1).joinDebate(1);
            await debatePool.connect(user2).joinDebate(1);
        });

        it("Should allow oracle to declare winner", async function () {
            // Create signature for winner result using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                WinnerResult: [
                    { name: "debateId", type: "uint256" },
                    { name: "winner", type: "address" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const winnerResult = {
                debateId: 1,
                winner: user1.address,
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature = await oracle.signTypedData(domain, types, winnerResult);

            const winnerResultWithSig = {
                ...winnerResult,
                signature
            };

            const tx = await debatePool.connect(oracle).declareWinner(winnerResultWithSig);

            await expect(tx)
                .to.emit(debatePool, "WinnerDeclared")
                .withArgs(1, user1.address, ENTRY_FEE * 2n - (ENTRY_FEE * 2n * 20n / 10000n)); // Total pool minus 20% platform fee

            await expect(tx)
                .to.emit(debatePool, "PointsAwarded")
                .withArgs(user1.address, 1000, "debate_winner");

            const debate = await debatePool.getDebate(1);
            expect(debate.winner).to.equal(user1.address);
            expect(debate.isCompleted).to.be.true;
            expect(debate.isActive).to.be.false;

            const userPoints = await debatePool.getUserPoints(user1.address);
            expect(userPoints).to.equal(1100); // 100 participation + 1000 winner
        });

        it("Should only allow oracle to declare winner", async function () {
            const winnerResult = {
                debateId: 1,
                winner: user1.address,
                timestamp: Math.floor(Date.now() / 1000),
                signature: "0x"
            };

            await expect(
                debatePool.connect(user1).declareWinner(winnerResult)
            ).to.be.revertedWithCustomError(debatePool, "ECDSAInvalidSignatureLength");
        });

        it("Should prevent declaring winner for completed debate", async function () {
            // First declaration using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                WinnerResult: [
                    { name: "debateId", type: "uint256" },
                    { name: "winner", type: "address" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const winnerResult1 = {
                debateId: 1,
                winner: user1.address,
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature1 = await oracle.signTypedData(domain, types, winnerResult1);
            const winnerResultWithSig1 = { ...winnerResult1, signature: signature1 };

            await debatePool.connect(oracle).declareWinner(winnerResultWithSig1);

            // Second declaration should fail
            const winnerResult2 = {
                debateId: 1,
                winner: user2.address,
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature2 = await oracle.signTypedData(domain, types, winnerResult2);
            const winnerResultWithSig2 = { ...winnerResult2, signature: signature2 };

            await expect(
                debatePool.connect(oracle).declareWinner(winnerResultWithSig2)
            ).to.be.revertedWith("DebatePoolV2: Debate is not active");
        });
    });

    describe("Refund System", function () {
        beforeEach(async function () {
            await debatePool.connect(oracle).createDebate(
                "Test Debate Topic",
                ENTRY_FEE,
                MAX_PARTICIPANTS,
                DURATION
            );
            await debatePool.connect(user1).joinDebate(1);
            await debatePool.connect(user2).joinDebate(1);
        });

        it("Should allow users to request refunds after debate expires", async function () {
            // Fast forward time to after debate ends
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);

            const tx = await debatePool.connect(user1).requestRefund(1);

            await expect(tx)
                .to.emit(debatePool, "RefundProcessed")
                .withArgs(1, user1.address, ENTRY_FEE);

            const debate = await debatePool.getDebate(1);
            expect(debate.participants.length).to.equal(1); // user2 still in
            expect(await debatePool.isParticipant(1, user1.address)).to.be.false;
        });

        it("Should prevent refunds before debate expires", async function () {
            await expect(
                debatePool.connect(user1).requestRefund(1)
            ).to.be.revertedWith("DebatePoolV2: Debate not expired");
        });

        it("Should prevent refunds after winner is declared", async function () {
            // Declare winner using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                WinnerResult: [
                    { name: "debateId", type: "uint256" },
                    { name: "winner", type: "address" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const winnerResult = {
                debateId: 1,
                winner: user1.address,
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature = await oracle.signTypedData(domain, types, winnerResult);
            const winnerResultWithSig = { ...winnerResult, signature };

            await debatePool.connect(oracle).declareWinner(winnerResultWithSig);

            // Try to refund
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                debatePool.connect(user2).requestRefund(1)
            ).to.be.revertedWith("DebatePoolV2: Winner already declared");
        });

        it("Should allow processing expired debates", async function () {
            // Fast forward time to after timeout period
            await ethers.provider.send("evm_increaseTime", [DURATION + 24 * 3600 + 1]);
            await ethers.provider.send("evm_mine", []);

            const tx = await debatePool.processExpiredDebate(1);

            await expect(tx)
                .to.emit(debatePool, "RefundProcessed")
                .withArgs(1, user1.address, ENTRY_FEE);

            await expect(tx)
                .to.emit(debatePool, "RefundProcessed")
                .withArgs(1, user2.address, ENTRY_FEE);

            const debate = await debatePool.getDebate(1);
            expect(debate.isCompleted).to.be.true;
            expect(debate.isActive).to.be.false;
        });

        it("Should allow emergency refunds by owner", async function () {
            const tx = await debatePool.emergencyRefund(1);

            await expect(tx)
                .to.emit(debatePool, "RefundProcessed")
                .withArgs(1, user1.address, ENTRY_FEE);

            await expect(tx)
                .to.emit(debatePool, "RefundProcessed")
                .withArgs(1, user2.address, ENTRY_FEE);

            const debate = await debatePool.getDebate(1);
            expect(debate.isCompleted).to.be.true;
            expect(debate.isActive).to.be.false;
        });
    });

    describe("Emergency Controls", function () {
        it("Should allow owner to toggle emergency pause", async function () {
            const tx = await debatePool.toggleEmergencyPause();

            await expect(tx)
                .to.emit(debatePool, "EmergencyPauseToggled")
                .withArgs(true);

            expect(await debatePool.emergencyPaused()).to.be.true;

            // Toggle back
            await debatePool.toggleEmergencyPause();
            expect(await debatePool.emergencyPaused()).to.be.false;
        });

        it("Should prevent operations when paused", async function () {
            await debatePool.toggleEmergencyPause();

            await expect(
                debatePool.connect(oracle).createDebate("Test", ENTRY_FEE, MAX_PARTICIPANTS, DURATION)
            ).to.be.revertedWith("DebatePoolV2: Contract is paused");
        });
    });

    describe("Points System", function () {
        it("Should allow oracle to award points", async function () {
            // Create signature for points award using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                PointsAward: [
                    { name: "user", type: "address" },
                    { name: "points", type: "uint256" },
                    { name: "reason", type: "string" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const pointsAward = {
                user: user1.address,
                points: 50,
                reason: "test",
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature = await oracle.signTypedData(domain, types, pointsAward);

            const pointsAwardWithSig = {
                ...pointsAward,
                signature
            };

            const tx = await debatePool.awardPoints(pointsAwardWithSig);

            await expect(tx)
                .to.emit(debatePool, "PointsAwarded")
                .withArgs(user1.address, 50, "test");

            expect(await debatePool.getUserPoints(user1.address)).to.equal(50);
        });

        it("Should allow oracle to award like points", async function () {
            // Create signature for like points award using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                PointsAward: [
                    { name: "user", type: "address" },
                    { name: "points", type: "uint256" },
                    { name: "reason", type: "string" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const pointsAward = {
                user: user1.address,
                points: 10,
                reason: "like",
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature = await oracle.signTypedData(domain, types, pointsAward);

            const pointsAwardWithSig = {
                ...pointsAward,
                signature
            };

            const tx = await debatePool.awardLikePoints(pointsAwardWithSig);

            await expect(tx)
                .to.emit(debatePool, "PointsAwarded")
                .withArgs(user1.address, 10, "like");

            expect(await debatePool.getUserPoints(user1.address)).to.equal(10);
        });

        it("Should allow oracle to award share points", async function () {
            // Create signature for share points award using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                PointsAward: [
                    { name: "user", type: "address" },
                    { name: "points", type: "uint256" },
                    { name: "reason", type: "string" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const pointsAward = {
                user: user1.address,
                points: 10,
                reason: "share",
                timestamp: Math.floor(Date.now() / 1000)
            };

            const signature = await oracle.signTypedData(domain, types, pointsAward);

            const pointsAwardWithSig = {
                ...pointsAward,
                signature
            };

            const tx = await debatePool.awardSharePoints(pointsAwardWithSig);

            await expect(tx)
                .to.emit(debatePool, "PointsAwarded")
                .withArgs(user1.address, 10, "share");

            expect(await debatePool.getUserPoints(user1.address)).to.equal(10);
        });

        it("Should only allow oracle to award points", async function () {
            const invalidPointsAward = {
                user: user1.address,
                points: 50,
                reason: "test",
                timestamp: Math.floor(Date.now() / 1000),
                signature: "0x" // Invalid signature
            };

            await expect(
                debatePool.awardPoints(invalidPointsAward)
            ).to.be.revertedWithCustomError(debatePool, "ECDSAInvalidSignatureLength");
        });
    });

    describe("Airdrop System", function () {
        let airdropToken: MockERC20;

        beforeEach(async function () {
            // Deploy mock airdrop token
            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            airdropToken = await MockERC20Factory.deploy("Airdrop Token", "AIR", 18);
            await airdropToken.waitForDeployment();

            // Mint tokens to contract
            await airdropToken.mint(await debatePool.getAddress(), ethers.parseUnits("1000", 18));
        });

        it("Should allow owner to setup airdrop", async function () {
            const tx = await debatePool.setupAirdrop(
                await airdropToken.getAddress(),
                ethers.parseUnits("1000", 18)
            );

            await expect(tx)
                .to.emit(debatePool, "AirdropSetup")
                .withArgs(await airdropToken.getAddress(), ethers.parseUnits("1000", 18), await ethers.provider.getBlockNumber());

            expect(await debatePool.airdropEnabled()).to.be.true;
            expect(await debatePool.totalAirdropAmount()).to.equal(ethers.parseUnits("1000", 18));
        });

        it("Should allow users to claim airdrop", async function () {
            // Setup airdrop
            await debatePool.setupAirdrop(
                await airdropToken.getAddress(),
                ethers.parseUnits("1000", 18)
            );

            // Award points to user using EIP-712
            const pointsDomain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const pointsTypes = {
                PointsAward: [
                    { name: "user", type: "address" },
                    { name: "points", type: "uint256" },
                    { name: "reason", type: "string" },
                    { name: "timestamp", type: "uint256" }
                ]
            };

            const pointsAward = {
                user: user1.address,
                points: 100,
                reason: "test",
                timestamp: Math.floor(Date.now() / 1000)
            };

            const pointsSignature = await oracle.signTypedData(pointsDomain, pointsTypes, pointsAward);

            const pointsAwardWithSig = {
                ...pointsAward,
                signature: pointsSignature
            };

            await debatePool.awardPoints(pointsAwardWithSig);

            // Create signature for airdrop claim using proper EIP-712
            const domain = {
                name: "DebatePoolV2",
                version: "1",
                chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                verifyingContract: await debatePool.getAddress()
            };

            const types = {
                AirdropClaim: [
                    { name: "userPointsAmount", type: "uint256" },
                    { name: "totalPoints", type: "uint256" },
                    { name: "messageHash", type: "bytes32" }
                ]
            };

            const messageHash = ethers.keccak256(ethers.toUtf8Bytes("airdrop_claim"));
            const airdropData = {
                userPointsAmount: 100,
                totalPoints: 100,
                messageHash: messageHash
            };

            const signature = await oracle.signTypedData(domain, types, airdropData);

            // Mint tokens to contract for airdrop
            await airdropToken.mint(await debatePool.getAddress(), ethers.parseUnits("1000", 18));

            // Claim airdrop - the contract expects the raw messageHash, not the EIP-712 hash
            await expect(
                debatePool.connect(user1).claimAirdrop(
                    100,
                    100,
                    messageHash,
                    signature
                )
            ).to.emit(debatePool, "AirdropClaimed")
             .withArgs(user1.address, ethers.parseUnits("1000", 18), 100);
        });
    });
});
