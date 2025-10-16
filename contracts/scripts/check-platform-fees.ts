import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [owner] = await ethers.getSigners();
    
    console.log("💰 Platform Fee Balance Check");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Owner: ${owner.address}`);
    
    // Check contract balance
    const contractBalance = await contract.getContractBalance();
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`\n📊 Current Status:`);
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    if (contractBalance === 0n) {
      console.log(`\n💡 No platform fees accumulated yet.`);
      console.log(`   Platform fees are generated when debates complete:`);
      console.log(`   - Each participant pays 1 USDC entry fee`);
      console.log(`   - Winner gets 0.8 USDC (80%)`);
      console.log(`   - Platform gets 0.2 USDC (20%)`);
      console.log(`   - Platform fees accumulate in the contract`);
    } else {
      console.log(`\n💰 Platform fees available for withdrawal!`);
      console.log(`   Amount: ${contractBalanceFormatted} USDC`);
      console.log(`   Owner can withdraw using: withdrawFunds()`);
    }
    
    // Check active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`\n📋 Active Debates: ${activeDebates.length}`);
    
    if (activeDebates.length > 0) {
      console.log(`   Debate IDs: ${activeDebates.join(", ")}`);
      console.log(`   💡 Complete these debates to generate platform fees`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
