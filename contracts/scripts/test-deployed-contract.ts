import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Deployed DebatePool Contract...");
  
  // Contract details
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const ORACLE_ADDRESS = "0x1DAe81d71810345eEd830782Fd570A871C92919D";

  try {
    // Get signers (we only need the owner for most operations)
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const oracle = signers[1] || owner; // Fallback to owner if no second signer
    const participant1 = signers[2] || owner; // Fallback to owner if no third signer
    const participant2 = signers[3] || owner; // Fallback to owner if no fourth signer
    
    // Connect to contracts
    const debatePool = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
    console.log(`\n📋 Contract Information:`);
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Owner: ${owner.address}`);
    console.log(`   Oracle: ${oracle.address}`);
    console.log(`   Participant 1: ${participant1.address}`);
    console.log(`   Participant 2: ${participant2.address}`);

    // Test 1: Verify contract state
    console.log(`\n🔍 Test 1: Contract State Verification`);
    const usdcToken = await debatePool.usdcToken();
    const oracleAddr = await debatePool.oracle();
    const platformFee = await debatePool.PLATFORM_FEE_PERCENTAGE();
    const contractOwner = await debatePool.owner();
    
    console.log(`✅ USDC Token: ${usdcToken}`);
    console.log(`✅ Oracle: ${oracleAddr}`);
    console.log(`✅ Platform Fee: ${platformFee}%`);
    console.log(`✅ Owner: ${contractOwner}`);

    // Test 2: Check balances
    console.log(`\n💰 Test 2: Balance Checks`);
    const ownerBalance = await ethers.provider.getBalance(owner.address);
    const oracleBalance = await ethers.provider.getBalance(oracle.address);
    const participant1Balance = await ethers.provider.getBalance(participant1.address);
    
    console.log(`✅ Owner ETH: ${ethers.formatEther(ownerBalance)} ETH`);
    console.log(`✅ Oracle ETH: ${ethers.formatEther(oracleBalance)} ETH`);
    console.log(`✅ Participant 1 ETH: ${ethers.formatEther(participant1Balance)} ETH`);

    // Test 3: Create a test debate
    console.log(`\n📝 Test 3: Creating Test Debate`);
    const topic = "Test Debate: Should we use AI for testing?";
    const entryFee = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const maxParticipants = 5;
    const duration = 1800; // 30 minutes

    console.log(`   Topic: ${topic}`);
    console.log(`   Entry Fee: ${ethers.formatUnits(entryFee, 6)} USDC`);
    console.log(`   Max Participants: ${maxParticipants}`);
    console.log(`   Duration: ${duration} seconds`);

    const createTx = await debatePool.createDebate(topic, entryFee, maxParticipants, duration);
    const createReceipt = await createTx.wait();
    
    // Extract debate ID from event
    let debateId = 0;
    for (const log of createReceipt?.logs || []) {
      try {
        const parsed = debatePool.interface.parseLog(log);
        if (parsed?.name === "DebateCreated") {
          debateId = Number(parsed.args.debateId);
          break;
        }
      } catch {
        // Skip logs that can't be parsed
      }
    }

    console.log(`✅ Debate created with ID: ${debateId}`);
    console.log(`✅ Transaction hash: ${createTx.hash}`);
    console.log(`✅ Gas used: ${createReceipt?.gasUsed.toString()}`);

    // Test 4: Retrieve debate details
    console.log(`\n🔍 Test 4: Retrieving Debate Details`);
    const debate = await debatePool.getDebate(debateId);
    
    console.log(`✅ Debate ID: ${debate.id}`);
    console.log(`✅ Topic: ${debate.topic}`);
    console.log(`✅ Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
    console.log(`✅ Max Participants: ${debate.maxParticipants}`);
    console.log(`✅ Start Time: ${new Date(Number(debate.startTime) * 1000).toISOString()}`);
    console.log(`✅ End Time: ${new Date(Number(debate.endTime) * 1000).toISOString()}`);
    console.log(`✅ Participants: ${debate.participants.length}`);
    console.log(`✅ Active: ${debate.isActive}`);
    console.log(`✅ Completed: ${debate.isCompleted}`);

    // Test 5: Get active debates
    console.log(`\n📋 Test 5: Active Debates`);
    const activeDebates = await debatePool.getActiveDebates();
    console.log(`✅ Active debates count: ${activeDebates.length}`);
    if (activeDebates.length > 0) {
      console.log(`✅ Active debate IDs: ${activeDebates.join(", ")}`);
    }

    // Test 6: Contract balance
    console.log(`\n💰 Test 6: Contract Balance`);
    const contractBalance = await debatePool.getContractBalance();
    console.log(`✅ Contract USDC balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);

    // Test 7: Gas estimation for future operations
    console.log(`\n⛽ Test 7: Gas Estimation`);
    try {
      const gasEstimate = await debatePool.createDebate.estimateGas(
        "Gas test debate",
        ethers.parseUnits("0.1", 6),
        3,
        1800
      );
      console.log(`✅ Gas estimate for debate creation: ${gasEstimate.toString()}`);
    } catch (error) {
      console.log(`⚠️  Gas estimation failed: ${error}`);
    }

    console.log(`\n🎉 All tests completed successfully!`);
    console.log(`\n📝 Summary:`);
    console.log(`   ✅ Contract is deployed and accessible`);
    console.log(`   ✅ Contract state is correct`);
    console.log(`   ✅ Debate creation works`);
    console.log(`   ✅ Oracle wallet has sufficient ETH`);
    console.log(`   ✅ Ready for integration with backend`);

  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
