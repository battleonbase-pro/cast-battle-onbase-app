import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing DebatePool Contract...");

  // Get contract address from environment or use default
  const contractAddress = process.env.DEBATE_POOL_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  if (contractAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Please set DEBATE_POOL_CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }

  console.log(`📋 Testing contract at: ${contractAddress}`);

  // Get signers
  const [owner, oracle, participant1, participant2] = await ethers.getSigners();
  console.log(`👤 Owner: ${owner.address}`);
  console.log(`🔮 Oracle: ${oracle.address}`);
  console.log(`👥 Participants: ${participant1.address}, ${participant2.address}`);

  // Connect to contract
  const DebatePool = await ethers.getContractFactory("DebatePool");
  const debatePool = DebatePool.attach(contractAddress);

  // Test 1: Check contract state
  console.log("\n🔍 Test 1: Contract State");
  const usdcToken = await debatePool.usdcToken();
  const contractOracle = await debatePool.oracle();
  const platformFee = await debatePool.PLATFORM_FEE_PERCENTAGE();
  
  console.log(`   USDC Token: ${usdcToken}`);
  console.log(`   Oracle: ${contractOracle}`);
  console.log(`   Platform Fee: ${platformFee}%`);

  // Test 2: Create a test debate
  console.log("\n🎯 Test 2: Create Test Debate");
  const topic = "Should AI replace human judges in debates?";
  const entryFee = ethers.parseUnits("1", 6); // 1 USDC
  const maxParticipants = 3;
  const duration = 3600; // 1 hour

  try {
    const tx = await debatePool.connect(owner).createDebate(topic, entryFee, maxParticipants, duration);
    const receipt = await tx.wait();
    console.log(`   ✅ Debate created! Transaction: ${receipt.hash}`);
    
    const debateId = 1; // Assuming this is the first debate
    const debate = await debatePool.getDebate(debateId);
    console.log(`   📋 Debate ID: ${debate.id}`);
    console.log(`   📝 Topic: ${debate.topic}`);
    console.log(`   💰 Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
    console.log(`   👥 Max Participants: ${debate.maxParticipants}`);
    console.log(`   ⏰ Duration: ${duration} seconds`);
    console.log(`   🟢 Active: ${debate.isActive}`);
  } catch (error) {
    console.error(`   ❌ Failed to create debate:`, error);
  }

  // Test 3: Check active debates
  console.log("\n📊 Test 3: Active Debates");
  try {
    const activeDebates = await debatePool.getActiveDebates();
    console.log(`   📋 Active debates: ${activeDebates.length}`);
    activeDebates.forEach((id: bigint) => {
      console.log(`   - Debate ID: ${id}`);
    });
  } catch (error) {
    console.error(`   ❌ Failed to get active debates:`, error);
  }

  // Test 4: Check contract balance
  console.log("\n💰 Test 4: Contract Balance");
  try {
    const balance = await debatePool.getContractBalance();
    console.log(`   💵 Contract Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  } catch (error) {
    console.error(`   ❌ Failed to get contract balance:`, error);
  }

  // Test 5: Test EIP-712 signature (oracle only)
  console.log("\n🔐 Test 5: EIP-712 Signature Test");
  try {
    const debateId = 1;
    const winner = participant1.address;
    const timestamp = Math.floor(Date.now() / 1000);

    // Create signature using oracle wallet
    const domain = {
      name: 'DebatePool',
      version: '1',
      chainId: 84532, // Base Sepolia
      verifyingContract: contractAddress
    };

    const types = {
      WinnerResult: [
        { name: 'debateId', type: 'uint256' },
        { name: 'winner', type: 'address' },
        { name: 'timestamp', type: 'uint256' }
      ]
    };

    const value = {
      debateId: debateId,
      winner: winner,
      timestamp: timestamp
    };

    const signature = await oracle.signTypedData(domain, types, value);
    console.log(`   ✅ Signature created: ${signature.slice(0, 20)}...`);
    console.log(`   📋 Debate ID: ${debateId}`);
    console.log(`   🏆 Winner: ${winner}`);
    console.log(`   ⏰ Timestamp: ${timestamp}`);
  } catch (error) {
    console.error(`   ❌ Failed to create signature:`, error);
  }

  console.log("\n✅ Contract testing completed!");
  console.log("\n📝 Next Steps:");
  console.log("1. Fund participant wallets with Base Sepolia USDC");
  console.log("2. Test joinDebate() function");
  console.log("3. Test declareWinner() function");
  console.log("4. Verify rewards distribution");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
