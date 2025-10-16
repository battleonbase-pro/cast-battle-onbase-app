import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log("📋 On-Chain Active Debates");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get all active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`\n🔍 Found ${activeDebates.length} active debates on-chain:`);
    
    for (let i = 0; i < activeDebates.length; i++) {
      const debateId = activeDebates[i];
      console.log(`\n📝 Debate ${debateId}:`);
      
      try {
        const debate = await contract.getDebate(debateId);
        
        console.log(`   ID: ${debate.id}`);
        console.log(`   Topic: ${debate.topic}`);
        console.log(`   Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
        console.log(`   Max Participants: ${debate.maxParticipants}`);
        console.log(`   Current Participants: ${debate.participants.length}`);
        console.log(`   Start Time: ${new Date(Number(debate.startTime) * 1000).toISOString()}`);
        console.log(`   End Time: ${new Date(Number(debate.endTime) * 1000).toISOString()}`);
        console.log(`   Active: ${debate.isActive}`);
        console.log(`   Completed: ${debate.isCompleted}`);
        console.log(`   Winner: ${debate.winner === "0x0000000000000000000000000000000000000000" ? "Not declared yet" : debate.winner}`);
        
        // Calculate time remaining
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(debate.endTime);
        const timeRemaining = endTime - now;
        
        if (timeRemaining > 0) {
          const hours = Math.floor(timeRemaining / 3600);
          const minutes = Math.floor((timeRemaining % 3600) / 60);
          console.log(`   Time Remaining: ${hours}h ${minutes}m`);
        } else {
          console.log(`   Status: Expired (ready for winner declaration)`);
        }
        
        // Show participant addresses
        if (debate.participants.length > 0) {
          console.log(`   Participants:`);
          debate.participants.forEach((participant, index) => {
            console.log(`     ${index + 1}. ${participant}`);
          });
        } else {
          console.log(`   Participants: None yet`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error reading debate ${debateId}: ${error.message}`);
      }
    }
    
    console.log(`\n🎯 Summary:`);
    console.log(`   ✅ All debate data is stored on-chain`);
    console.log(`   ✅ Immutable and transparent`);
    console.log(`   ✅ Accessible via contract functions`);
    console.log(`   ✅ Real-time status updates`);
    
    console.log(`\n🔗 View on Basescan:`);
    console.log(`   https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`);
    
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
