import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log("🔗 Linking Database Battles to On-Chain Debates");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get current on-chain debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`\n📋 Available On-Chain Debates:`);
    
    for (const debateId of activeDebates) {
      const debate = await contract.getDebate(debateId);
      console.log(`   Debate ${debateId}: "${debate.topic}"`);
      console.log(`     Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
      console.log(`     Participants: ${debate.participants.length}`);
      console.log(`     Active: ${debate.isActive}`);
    }
    
    console.log(`\n🔧 Integration Steps:`);
    console.log(`   1. ✅ Added debateId field to Battle model`);
    console.log(`   2. ✅ Added database methods for linking battles to debates`);
    console.log(`   3. ✅ Updated oracle to use correct debate ID`);
    console.log(`   4. ⏳ Need to run database migration`);
    console.log(`   5. ⏳ Need to link existing battles to debates`);
    
    console.log(`\n📝 Database Migration Commands:`);
    console.log(`   # Worker database`);
    console.log(`   cd worker && npx prisma db push`);
    console.log(`   `);
    console.log(`   # Frontend database`);
    console.log(`   cd .. && npx prisma db push`);
    
    console.log(`\n🔗 Linking Example:`);
    console.log(`   // Link battle to debate ID 2 (1 USDC entry fee)`);
    console.log(`   await db.linkBattleToDebate(battleId, 2);`);
    
    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Run database migrations`);
    console.log(`   2. Link existing battles to on-chain debates`);
    console.log(`   3. Update battle creation to assign debate IDs`);
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
