import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 CHECKING CURRENT BATTLE STATUS");
    
    // Find the most recent battle
    const recentBattle = await prisma.battle.findFirst({
      where: {
        status: 'ACTIVE'
      },
      include: {
        participants: true,
        casts: true,
        winners: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (recentBattle) {
      console.log("\n📊 CURRENT ACTIVE BATTLE:");
      console.log(`   ID: ${recentBattle.id}`);
      console.log(`   Title: ${recentBattle.title}`);
      console.log(`   Status: ${recentBattle.status}`);
      console.log(`   Debate ID: ${recentBattle.debateId || 'null'}`);
      console.log(`   Participants: ${recentBattle.participants.length}`);
      console.log(`   Casts: ${recentBattle.casts.length}`);
      console.log(`   Winners: ${recentBattle.winners.length}`);
      console.log(`   End Time: ${recentBattle.endTime}`);
      
      if (recentBattle.debateId) {
        console.log("   ✅ On-chain integration: YES");
      } else {
        console.log("   ⚠️ On-chain integration: NO");
      }
    } else {
      console.log("\n❌ NO ACTIVE BATTLE FOUND");
      
      // Check the most recent battle regardless of status
      const lastBattle = await prisma.battle.findFirst({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          participants: true,
          casts: true,
          winners: true
        }
      });
      
      if (lastBattle) {
        console.log("\n📊 MOST RECENT BATTLE:");
        console.log(`   ID: ${lastBattle.id}`);
        console.log(`   Title: ${lastBattle.title}`);
        console.log(`   Status: ${lastBattle.status}`);
        console.log(`   Debate ID: ${lastBattle.debateId || 'null'}`);
        console.log(`   Participants: ${lastBattle.participants.length}`);
        console.log(`   Casts: ${lastBattle.casts.length}`);
        console.log(`   Winners: ${lastBattle.winners.length}`);
        console.log(`   Created: ${lastBattle.createdAt}`);
        console.log(`   End Time: ${lastBattle.endTime}`);
      }
    }

  } catch (error) {
    console.error("❌ Error checking battle status:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
