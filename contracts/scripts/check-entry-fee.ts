import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const debate = await contract.getDebate(1);
    
    console.log("🔍 Checking Debate 1 Entry Fee:");
    console.log(`   Raw Entry Fee: ${debate.entryFee.toString()} wei`);
    console.log(`   Formatted Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
    console.log(`   Topic: ${debate.topic}`);
    
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
