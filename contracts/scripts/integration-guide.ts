import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log("🔗 Smart Contract Integration Guide");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Show current debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`\n📋 Current On-Chain Debates:`);
    
    for (const debateId of activeDebates) {
      const debate = await contract.getDebate(debateId);
      console.log(`   Debate ${debateId}: "${debate.topic}"`);
      console.log(`     Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
      console.log(`     Participants: ${debate.participants.length}`);
      console.log(`     Active: ${debate.isActive}`);
    }
    
    console.log(`\n🔧 Integration Requirements:`);
    console.log(`   1. Map database battle IDs to on-chain debate IDs`);
    console.log(`   2. Update worker to call correct debate ID`);
    console.log(`   3. Ensure winner addresses match between systems`);
    
    console.log(`\n📝 Example Integration:`);
    console.log(`   // In battle-manager-db.ts`);
    console.log(`   const debateId = await this.getDebateIdForBattle(battleId);`);
    console.log(`   await this.oracle.processBattleCompletion(debateId, winnerAddress);`);
    
    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Add debateId field to Battle model in database`);
    console.log(`   2. Update battle creation to assign debate IDs`);
    console.log(`   3. Modify oracle to use correct debate ID`);
    console.log(`   4. Test end-to-end flow`);
    
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
