import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const DEV_WALLET = "0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7";
  
  try {
    console.log("📋 USDC Withdrawal Analysis & Solutions");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Dev Wallet: ${DEV_WALLET}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [signer] = await ethers.getSigners();
    
    console.log(`   Current Signer: ${signer.address}`);
    
    // Check contract owner
    const contractOwner = await contract.owner();
    console.log(`   Contract Owner: ${contractOwner}`);
    
    // Check oracle
    const oracleAddress = await contract.oracle();
    console.log(`   Oracle Address: ${oracleAddress}`);
    
    // Check USDC balance in contract
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    // Get active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    console.log(`\n🔍 Problem Analysis:`);
    console.log(`   ✅ Contract has ${contractBalanceFormatted} USDC`);
    console.log(`   ✅ You are the contract owner`);
    console.log(`   ❌ ${activeDebates.length} debates are still active`);
    console.log(`   ❌ All debates have 0 participants`);
    console.log(`   ❌ All debates have expired`);
    console.log(`   ❌ Only oracle can complete debates`);
    console.log(`   ❌ Oracle is different from your address`);
    
    console.log(`\n💡 Solutions to Withdraw USDC:`);
    
    console.log(`\n🔧 Solution 1: Use Oracle Private Key`);
    console.log(`   If you have access to the oracle's private key:`);
    console.log(`   1. Import oracle private key into Hardhat config`);
    console.log(`   2. Run: npx hardhat run scripts/complete-debates-and-withdraw.ts --network baseSepolia`);
    console.log(`   Oracle Address: ${oracleAddress}`);
    
    console.log(`\n🔧 Solution 2: Modify Contract (Recommended)`);
    console.log(`   Add an emergency withdrawal function:`);
    console.log(`   1. Deploy a new contract with emergency withdrawal`);
    console.log(`   2. Or upgrade the existing contract`);
    console.log(`   3. Add function: emergencyWithdraw() - owner only`);
    
    console.log(`\n🔧 Solution 3: Manual Contract Interaction`);
    console.log(`   Use a tool like Remix or Etherscan:`);
    console.log(`   1. Connect with oracle private key`);
    console.log(`   2. Call declareWinner for each debate with dummy data`);
    console.log(`   3. Then call withdrawFunds()`);
    
    console.log(`\n🔧 Solution 4: Wait for Natural Resolution`);
    console.log(`   The debates might auto-complete after a certain period`);
    console.log(`   Check if there's a timeout mechanism in the contract`);
    
    console.log(`\n📝 Current Contract State:`);
    for (const debateId of activeDebates) {
      try {
        const debate = await contract.getDebate(debateId);
        const endTime = new Date(Number(debate.endTime) * 1000);
        console.log(`   Debate ${debateId}:`);
        console.log(`     Topic: ${debate.topic}`);
        console.log(`     Participants: ${debate.participants.length}`);
        console.log(`     End Time: ${endTime.toISOString()}`);
        console.log(`     Is Active: ${debate.isActive}`);
        console.log(`     Is Completed: ${debate.isCompleted}`);
      } catch (error) {
        console.log(`   Error getting debate ${debateId}: ${error.message}`);
      }
    }
    
    console.log(`\n🎯 Recommended Action:`);
    console.log(`   Since you need the funds urgently for testing:`);
    console.log(`   1. Check if you have the oracle private key`);
    console.log(`   2. If not, modify the contract to add emergency withdrawal`);
    console.log(`   3. Or create a new contract with better withdrawal logic`);
    
    console.log(`\n💻 Emergency Withdrawal Function:`);
    console.log(`   Add this to your contract:`);
    console.log(`   function emergencyWithdraw() external onlyOwner {`);
    console.log(`       uint256 balance = usdcToken.balanceOf(address(this));`);
    console.log(`       require(balance > 0, "No funds to withdraw");`);
    console.log(`       usdcToken.transfer(owner(), balance);`);
    console.log(`   }`);
    
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