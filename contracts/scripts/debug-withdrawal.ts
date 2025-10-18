import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const DEV_WALLET = "0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7";
  
  try {
    console.log("🔍 Debugging Withdrawal Issue");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Dev Wallet: ${DEV_WALLET}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [signer] = await ethers.getSigners();
    
    console.log(`   Current Signer: ${signer.address}`);
    
    // Check contract owner
    const contractOwner = await contract.owner();
    console.log(`   Contract Owner: ${contractOwner}`);
    
    // Check USDC balance in contract
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    // Check if there's a getContractBalance function
    try {
      const contractBalanceMethod = await contract.getContractBalance();
      const contractBalanceMethodFormatted = ethers.formatUnits(contractBalanceMethod, 6);
      console.log(`   Contract Balance (via getContractBalance): ${contractBalanceMethodFormatted} USDC`);
    } catch (error) {
      console.log(`   getContractBalance method not available`);
    }
    
    // Check active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    if (activeDebates.length > 0) {
      console.log(`   Active Debate IDs: ${activeDebates.join(', ')}`);
      
      // Check each active debate
      for (const debateId of activeDebates) {
        try {
          const debate = await contract.getDebate(debateId);
          console.log(`   Debate ${debateId}:`);
          console.log(`     Topic: ${debate.topic}`);
          console.log(`     Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
          console.log(`     Participants: ${debate.participants.length}`);
          console.log(`     Is Active: ${debate.isActive}`);
          console.log(`     Is Completed: ${debate.isCompleted}`);
          console.log(`     Winner: ${debate.winner}`);
        } catch (error) {
          console.log(`   Error getting debate ${debateId}: ${error.message}`);
        }
      }
    }
    
    // Try to estimate gas for withdrawFunds
    try {
      console.log(`\n🔍 Estimating gas for withdrawFunds...`);
      const gasEstimate = await contract.withdrawFunds.estimateGas();
      console.log(`   Gas estimate: ${gasEstimate.toString()}`);
    } catch (error) {
      console.log(`   Gas estimation failed: ${error.message}`);
      
      // Check if it's a specific revert reason
      if (error.message.includes("DebatePool: No funds to withdraw")) {
        console.log(`   ❌ The contract thinks there are no funds to withdraw!`);
        console.log(`   This might be because the funds are locked in active debates.`);
      }
    }
    
    // Check if we can call withdrawFunds with a different approach
    console.log(`\n💡 Possible Issues:`);
    console.log(`   1. Funds might be locked in active debates`);
    console.log(`   2. The withdrawFunds function might only work for platform fees, not all funds`);
    console.log(`   3. There might be a different function to withdraw all funds`);
    
    // Let's check if there are any other withdrawal functions
    console.log(`\n🔍 Checking available functions...`);
    const contractInterface = contract.interface;
    const functions = contractInterface.functions;
    
    console.log(`   Available functions:`);
    for (const [name, func] of Object.entries(functions)) {
      if (name.toLowerCase().includes('withdraw') || name.toLowerCase().includes('fund')) {
        console.log(`     - ${name}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
