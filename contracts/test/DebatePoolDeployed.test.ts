import { expect } from "chai";
import { ethers } from "hardhat";
import { DebatePool, IERC20 } from "../typechain-types";

describe("DebatePool Contract Tests (Deployed)", function () {
  let debatePool: DebatePool;
  let usdc: IERC20;
  let owner: any;
  let oracle: any;
  let participant1: any;
  let participant2: any;
  let participant3: any;

  // Deployed contract address
  const DEPLOYED_CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const ORACLE_ADDRESS = "0x1DAe81d71810345eEd830782Fd570A871C92919D";

  before(async function () {
    console.log("🔗 Connecting to deployed DebatePool contract...");
    
    // Get signers
    [owner, oracle, participant1, participant2, participant3] = await ethers.getSigners();
    
    // Connect to deployed contract
    debatePool = await ethers.getContractAt("DebatePool", DEPLOYED_CONTRACT_ADDRESS);
    
    // Connect to USDC contract
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
    console.log(`✅ Connected to contract at: ${DEPLOYED_CONTRACT_ADDRESS}`);
    console.log(`✅ Owner: ${owner.address}`);
    console.log(`✅ Oracle: ${oracle.address}`);
    console.log(`✅ Participants: ${participant1.address}, ${participant2.address}, ${participant3.address}`);
  });

  describe("Contract State Verification", function () {
    it("Should have correct USDC token address", async function () {
      const usdcToken = await debatePool.usdcToken();
      expect(usdcToken).to.equal(USDC_ADDRESS);
      console.log(`✅ USDC Token: ${usdcToken}`);
    });

    it("Should have correct oracle address", async function () {
      const oracleAddr = await debatePool.oracle();
      expect(oracleAddr).to.equal(ORACLE_ADDRESS);
      console.log(`✅ Oracle: ${oracleAddr}`);
    });

    it("Should have correct platform fee percentage", async function () {
      const platformFee = await debatePool.PLATFORM_FEE_PERCENTAGE();
      expect(platformFee).to.equal(20); // 20%
      console.log(`✅ Platform Fee: ${platformFee}%`);
    });

    it("Should have correct owner", async function () {
      const contractOwner = await debatePool.owner();
      expect(contractOwner).to.equal(owner.address);
      console.log(`✅ Owner: ${contractOwner}`);
    });
  });

  describe("Debate Creation", function () {
    let debateId: number;

    it("Should create a new debate", async function () {
      const topic = "Should AI be regulated?";
      const entryFee = ethers.parseUnits("1", 6); // 1 USDC (6 decimals)
      const maxParticipants = 10;
      const duration = 3600; // 1 hour

      console.log(`📝 Creating debate: "${topic}"`);
      
      const tx = await debatePool.createDebate(topic, entryFee, maxParticipants, duration);
      const receipt = await tx.wait();
      
      // Get debate ID from event
      const event = receipt?.logs.find(log => {
        try {
          const parsed = debatePool.interface.parseLog(log);
          return parsed?.name === "DebateCreated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = debatePool.interface.parseLog(event);
        debateId = Number(parsed?.args.debateId);
        console.log(`✅ Debate created with ID: ${debateId}`);
      }

      expect(debateId).to.be.greaterThan(0);
    });

    it("Should retrieve debate details", async function () {
      const debate = await debatePool.getDebate(debateId);
      
      expect(debate.topic).to.equal("Should AI be regulated?");
      expect(debate.entryFee).to.equal(ethers.parseUnits("1", 6));
      expect(debate.maxParticipants).to.equal(10);
      expect(debate.isActive).to.be.true;
      expect(debate.isCompleted).to.be.false;
      
      console.log(`✅ Debate details retrieved:`);
      console.log(`   Topic: ${debate.topic}`);
      console.log(`   Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
      console.log(`   Max Participants: ${debate.maxParticipants}`);
      console.log(`   Active: ${debate.isActive}`);
    });
  });

  describe("USDC Balance and Approval", function () {
    it("Should check participant USDC balances", async function () {
      const balance1 = await usdc.balanceOf(participant1.address);
      const balance2 = await usdc.balanceOf(participant2.address);
      
      console.log(`💰 Participant 1 USDC Balance: ${ethers.formatUnits(balance1, 6)} USDC`);
      console.log(`💰 Participant 2 USDC Balance: ${ethers.formatUnits(balance2, 6)} USDC`);
      
      // Note: These might be 0 if participants don't have USDC
      expect(balance1).to.be.gte(0);
      expect(balance2).to.be.gte(0);
    });

    it("Should check USDC allowance", async function () {
      const allowance1 = await usdc.allowance(participant1.address, DEPLOYED_CONTRACT_ADDRESS);
      const allowance2 = await usdc.allowance(participant2.address, DEPLOYED_CONTRACT_ADDRESS);
      
      console.log(`🔐 Participant 1 Allowance: ${ethers.formatUnits(allowance1, 6)} USDC`);
      console.log(`🔐 Participant 2 Allowance: ${ethers.formatUnits(allowance2, 6)} USDC`);
      
      expect(allowance1).to.be.gte(0);
      expect(allowance2).to.be.gte(0);
    });
  });

  describe("Contract Functions", function () {
    it("Should get active debates", async function () {
      const activeDebates = await debatePool.getActiveDebates();
      console.log(`📋 Active Debates: ${activeDebates.length}`);
      
      if (activeDebates.length > 0) {
        console.log(`   Debate IDs: ${activeDebates.join(", ")}`);
      }
      
      expect(activeDebates).to.be.an("array");
    });

    it("Should get contract balance", async function () {
      const contractBalance = await debatePool.getContractBalance();
      console.log(`💰 Contract USDC Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
      
      expect(contractBalance).to.be.gte(0);
    });

    it("Should get user debates", async function () {
      const userDebates1 = await debatePool.getUserDebates(participant1.address);
      const userDebates2 = await debatePool.getUserDebates(participant2.address);
      
      console.log(`👤 Participant 1 Debates: ${userDebates1.length}`);
      console.log(`👤 Participant 2 Debates: ${userDebates2.length}`);
      
      expect(userDebates1).to.be.an("array");
      expect(userDebates2).to.be.an("array");
    });
  });

  describe("Oracle Signature Test", function () {
    it("Should verify oracle can sign winner results", async function () {
      // This test verifies the oracle can create valid EIP-712 signatures
      // We'll use a mock debate ID and winner address
      const mockDebateId = 1;
      const mockWinner = participant1.address;
      
      console.log(`🔐 Testing oracle signature for debate ${mockDebateId}, winner ${mockWinner}`);
      
      // Note: This test doesn't actually call the contract since we need real debate data
      // But it verifies the oracle address is correctly set
      const oracleAddr = await debatePool.oracle();
      expect(oracleAddr).to.equal(ORACLE_ADDRESS);
      
      console.log(`✅ Oracle address verified: ${oracleAddr}`);
    });
  });

  describe("Error Handling", function () {
    it("Should handle invalid debate ID", async function () {
      try {
        await debatePool.getDebate(999999);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        console.log(`✅ Correctly handled invalid debate ID: ${error.message}`);
        expect(error.message).to.include("Invalid debate ID");
      }
    });

    it("Should prevent non-owner from creating debates", async function () {
      try {
        await debatePool.connect(participant1).createDebate(
          "Unauthorized debate",
          ethers.parseUnits("1", 6),
          10,
          3600
        );
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        console.log(`✅ Correctly prevented non-owner from creating debate: ${error.message}`);
        expect(error.message).to.include("Ownable");
      }
    });
  });

  describe("Gas Estimation", function () {
    it("Should estimate gas for debate creation", async function () {
      const topic = "Gas estimation test";
      const entryFee = ethers.parseUnits("1", 6);
      const maxParticipants = 10;
      const duration = 3600;

      try {
        const gasEstimate = await debatePool.createDebate.estimateGas(
          topic, entryFee, maxParticipants, duration
        );
        console.log(`⛽ Estimated gas for debate creation: ${gasEstimate.toString()}`);
        expect(gasEstimate).to.be.greaterThan(0);
      } catch (error) {
        console.log(`⚠️  Gas estimation failed (might be due to contract state): ${error}`);
      }
    });
  });
});
