const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("🔗 Linking Existing Battles to On-Chain Debates");
  
  try {
    // Get all active battles that don't have a debateId
    const unlinkedBattles = await prisma.battle.findMany({
      where: {
        debateId: null,
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Found ${unlinkedBattles.length} unlinked active battles`);

    if (unlinkedBattles.length === 0) {
      console.log("✅ All battles are already linked to debates!");
      return;
    }

    // Available on-chain debates
    const availableDebates = [
      { id: 1, topic: "Test Debate: Should we use AI for testing?", entryFee: 0.1 },
      { id: 2, topic: "Should cryptocurrency be regulated by governments?", entryFee: 1.0 }
    ];

    console.log(`\n📋 Available On-Chain Debates:`);
    availableDebates.forEach(debate => {
      console.log(`   Debate ${debate.id}: "${debate.topic}" (${debate.entryFee} USDC)`);
    });

    // Link battles to debates
    let linkedCount = 0;
    for (let i = 0; i < unlinkedBattles.length && i < availableDebates.length; i++) {
      const battle = unlinkedBattles[i];
      const debate = availableDebates[i];

      try {
        await prisma.battle.update({
          where: { id: battle.id },
          data: { debateId: debate.id }
        });

        console.log(`✅ Linked battle "${battle.title}" to Debate ${debate.id}`);
        linkedCount++;
      } catch (error) {
        console.error(`❌ Failed to link battle "${battle.title}":`, error);
      }
    }

    console.log(`\n🎉 Successfully linked ${linkedCount} battles to on-chain debates!`);

    // Verify the linking
    console.log(`\n🔍 Verification:`);
    const linkedBattles = await prisma.battle.findMany({
      where: {
        debateId: { not: null }
      },
      select: {
        id: true,
        title: true,
        debateId: true,
        status: true
      }
    });

    linkedBattles.forEach(battle => {
      console.log(`   Battle "${battle.title}" → Debate ${battle.debateId} (${battle.status})`);
    });

    console.log(`\n📝 Next Steps:`);
    console.log(`   1. ✅ Database migrations completed`);
    console.log(`   2. ✅ Battles linked to on-chain debates`);
    console.log(`   3. ⏳ Test battle completion flow`);
    console.log(`   4. ⏳ Test oracle integration`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
