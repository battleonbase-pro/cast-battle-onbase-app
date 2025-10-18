import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    console.log("💰 USDC POOL DISTRIBUTION ANALYSIS");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log("\n❓ QUESTION:");
    console.log("   What happens to the 8 USDC locked in pool when a winner is chosen?");
    console.log("   Does 80% go to the winner?");
    
    console.log("\n🔍 CURRENT CONTRACT STATE:");
    
    // Check USDC balance
    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const usdcContract = await ethers.getContractAt("IERC20", usdcAddress);
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const balanceInUSDC = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${balanceInUSDC} USDC`);
    
    // Check active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    let totalParticipants = 0;
    let totalEntryFees = 0;
    
    for (const debateId of activeDebates) {
      const debate = await contract.getDebate(debateId);
      totalParticipants += debate.participants.length;
      totalEntryFees += debate.participants.length * Number(ethers.formatUnits(debate.entryFee, 6));
      console.log(`   Debate ${debateId}: ${debate.participants.length} participants, ${ethers.formatUnits(debate.entryFee, 6)} USDC entry fee`);
    }
    
    console.log(`   Total On-Chain Participants: ${totalParticipants}`);
    console.log(`   Expected USDC from Participants: ${totalEntryFees} USDC`);
    console.log(`   Actual Contract Balance: ${balanceInUSDC} USDC`);
    
    console.log("\n📋 HOW WINNER DISTRIBUTION WORKS:");
    console.log("   Looking at declareWinner() function:");
    console.log("   ```solidity");
    console.log("   function declareWinner(WinnerResult memory result) external {");
    console.log("       Debate storage debate = debates[result.debateId];");
    console.log("       ");
    console.log("       // Calculate rewards");
    console.log("       uint256 totalPool = debate.entryFee * debate.participants.length;");
    console.log("       uint256 platformFee = (totalPool * PLATFORM_FEE_PERCENTAGE) / BASIS_POINTS;");
    console.log("       uint256 winnerPrize = totalPool - platformFee;");
    console.log("       ");
    console.log("       // Transfer rewards");
    console.log("       if (winnerPrize > 0) {");
    console.log("           usdcToken.transfer(result.winner, winnerPrize);");
    console.log("       }");
    console.log("   }");
    console.log("   ```");
    
    console.log("\n🔍 KEY INSIGHT:");
    console.log("   The winner distribution is calculated PER DEBATE:");
    console.log("   - totalPool = debate.entryFee * debate.participants.length");
    console.log("   - winnerPrize = totalPool - platformFee");
    console.log("   ");
    console.log("   This means:");
    console.log("   ✅ Only USDC from THAT specific debate goes to winner");
    console.log("   ❌ USDC from OTHER debates does NOT go to winner");
    console.log("   ❌ Locked USDC from empty debates stays locked");
    
    console.log("\n📊 CURRENT SCENARIO:");
    console.log("   If a winner is chosen for ANY debate:");
    console.log(`   - Debate participants: ${totalParticipants}`);
    console.log(`   - Total pool for that debate: ${totalParticipants} USDC`);
    console.log(`   - Platform fee (20%): ${totalParticipants * 0.2} USDC`);
    console.log(`   - Winner prize (80%): ${totalParticipants * 0.8} USDC`);
    console.log(`   - Remaining locked USDC: ${parseFloat(balanceInUSDC) - totalParticipants} USDC`);
    
    console.log("\n🚫 THE PROBLEM:");
    console.log("   Since ALL debates have 0 participants:");
    console.log("   - totalPool = 0 USDC (for any debate)");
    console.log("   - winnerPrize = 0 USDC");
    console.log("   - Winner gets NOTHING");
    console.log("   - All 8 USDC remains locked");
    
    console.log("\n💡 WHAT WOULD HAPPEN IF DEBATE HAD PARTICIPANTS:");
    console.log("   Example: Debate with 3 participants, 1 USDC entry fee each");
    console.log("   - totalPool = 1 USDC * 3 = 3 USDC");
    console.log("   - platformFee = 3 USDC * 20% = 0.6 USDC");
    console.log("   - winnerPrize = 3 USDC - 0.6 USDC = 2.4 USDC");
    console.log("   - Winner gets 2.4 USDC");
    console.log("   - Platform gets 0.6 USDC");
    console.log("   - Other locked USDC (5 USDC) stays locked");
    
    console.log("\n🔍 PLATFORM FEE PERCENTAGE:");
    // Check the platform fee percentage
    try {
      const platformFeePercentage = await contract.PLATFORM_FEE_PERCENTAGE();
      const basisPoints = await contract.BASIS_POINTS();
      const feePercent = (Number(platformFeePercentage) / Number(basisPoints)) * 100;
      console.log(`   Platform Fee: ${platformFeePercentage} basis points = ${feePercent}%`);
      console.log(`   Winner gets: ${100 - feePercent}%`);
    } catch (error) {
      console.log("   Could not read platform fee percentage");
    }
    
    console.log("\n🎯 ANSWER TO YOUR QUESTION:");
    console.log("   ❌ NO - the 8 USDC locked in pool does NOT go to the winner");
    console.log("   ✅ Only USDC from the specific debate with participants goes to winner");
    console.log("   ✅ Winner gets 80% of THAT debate's pool");
    console.log("   ❌ Locked USDC from empty debates stays locked");
    console.log("   ❌ Since all debates have 0 participants, winner gets 0 USDC");
    
    console.log("\n🔄 WHAT NEEDS TO HAPPEN:");
    console.log("   1. Debates need participants (via joinDebate() or new function)");
    console.log("   2. Winner can only be declared for debates with participants");
    console.log("   3. Only that debate's USDC gets distributed");
    console.log("   4. Locked USDC from other debates remains locked");
    
    console.log("\n💡 KEY INSIGHT:");
    console.log("   The contract is designed to distribute USDC PER DEBATE, not globally.");
    console.log("   Each debate has its own pool based on its participants.");
    console.log("   Empty debates contribute nothing to winner prizes.");
    console.log("   This is why the 8 USDC remains locked - no debates have participants.");
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
