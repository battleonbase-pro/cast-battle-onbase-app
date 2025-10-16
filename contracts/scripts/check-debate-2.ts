import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log("🔍 Checking Debate 2 (1 USDC Entry Fee)...");
    
    const debate = await contract.getDebate(2);
    
    console.log(`✅ Debate ID: ${debate.id}`);
    console.log(`✅ Topic: ${debate.topic}`);
    console.log(`✅ Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
    console.log(`✅ Max Participants: ${debate.maxParticipants}`);
    console.log(`✅ Start Time: ${new Date(Number(debate.startTime) * 1000).toISOString()}`);
    console.log(`✅ End Time: ${new Date(Number(debate.endTime) * 1000).toISOString()}`);
    console.log(`✅ Participants: ${debate.participants.length}`);
    console.log(`✅ Active: ${debate.isActive}`);
    console.log(`✅ Completed: ${debate.isCompleted}`);
    
    console.log(`\n🎉 Perfect! Debate 2 has the correct 1 USDC entry fee!`);
    
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
