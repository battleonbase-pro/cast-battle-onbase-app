import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log("📝 Creating Debate with Correct 1 USDC Entry Fee...");
    
    const topic = "Should cryptocurrency be regulated by governments?";
    const entryFee = ethers.parseUnits("1", 6); // 1 USDC (6 decimals)
    const maxParticipants = 100;
    const duration = 14400; // 4 hours (4 * 3600 seconds)
    
    console.log(`   Topic: ${topic}`);
    console.log(`   Entry Fee: ${ethers.formatUnits(entryFee, 6)} USDC`);
    console.log(`   Max Participants: ${maxParticipants}`);
    console.log(`   Duration: ${duration / 3600} hours`);
    
    const tx = await contract.createDebate(topic, entryFee, maxParticipants, duration);
    const receipt = await tx.wait();
    
    // Extract debate ID from event
    let debateId = 0;
    for (const log of receipt?.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "DebateCreated") {
          debateId = Number(parsed.args.debateId);
          break;
        }
      } catch {
        // Skip logs that can't be parsed
      }
    }
    
    console.log(`\n✅ Debate created successfully!`);
    console.log(`   Debate ID: ${debateId}`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Gas Used: ${receipt?.gasUsed.toString()}`);
    
    // Verify the debate details
    console.log(`\n🔍 Verifying Debate Details:`);
    const debate = await contract.getDebate(debateId);
    
    console.log(`   ID: ${debate.id}`);
    console.log(`   Topic: ${debate.topic}`);
    console.log(`   Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
    console.log(`   Max Participants: ${debate.maxParticipants}`);
    console.log(`   Start Time: ${new Date(Number(debate.startTime) * 1000).toISOString()}`);
    console.log(`   End Time: ${new Date(Number(debate.endTime) * 1000).toISOString()}`);
    console.log(`   Participants: ${debate.participants.length}`);
    console.log(`   Active: ${debate.isActive}`);
    console.log(`   Completed: ${debate.isCompleted}`);
    
    console.log(`\n🎉 Correct 1 USDC entry fee debate created!`);
    console.log(`\n📝 Summary:`);
    console.log(`   ✅ Entry Fee: 1 USDC (as per requirements)`);
    console.log(`   ✅ Duration: 4 hours`);
    console.log(`   ✅ Max Participants: 100`);
    console.log(`   ✅ Ready for user participation`);
    
  } catch (error) {
    console.error("❌ Error creating debate:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
