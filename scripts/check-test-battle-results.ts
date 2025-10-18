import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 CHECKING BATTLE COMPLETION RESULTS");
    console.log("   Verifying if winner was created for the test battle");
    
    // Find the battle that was just completed
    const battle = await prisma.battle.findFirst({
      where: {
        title: "Will US crypto regulation boost or bust the industry?"
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        casts: {
          include: {
            user: true,
            likes: true,
            _count: {
              select: {
                likes: true
              }
            }
          }
        },
        winners: {
          include: {
            user: true
          }
        }
      }
    });

    if (!battle) {
      console.log("❌ Battle not found");
      return;
    }

    console.log("\n📊 BATTLE COMPLETION RESULTS:");
    console.log(`   ID: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Participants: ${battle.participants.length}`);
    console.log(`   Casts: ${battle.casts.length}`);
    console.log(`   Winners: ${battle.winners.length}`);
    console.log(`   Insights: ${battle.insights ? 'Yes' : 'No'}`);

    if (battle.participants.length > 0) {
      console.log("\n👥 PARTICIPANTS:");
      battle.participants.forEach((participant, index) => {
        console.log(`   ${index + 1}. ${participant.user.address}`);
      });
    }

    if (battle.casts.length > 0) {
      console.log("\n💬 CASTS:");
      battle.casts.forEach((cast, index) => {
        console.log(`   ${index + 1}. Side: ${cast.side}`);
        console.log(`      User: ${cast.user.address}`);
        console.log(`      Content: ${cast.content.substring(0, 100)}...`);
        console.log(`      Likes: ${cast._count.likes}`);
      });
    }

    if (battle.winners.length > 0) {
      console.log("\n🏆 WINNERS:");
      battle.winners.forEach((winner, index) => {
        console.log(`   ${index + 1}. Winner: ${winner.user.address}`);
        console.log(`      Position: ${winner.position}`);
        console.log(`      Prize: ${winner.prize}`);
      });
    } else {
      console.log("\n❌ NO WINNERS FOUND");
      console.log("   This suggests the winner creation process failed again");
    }

    // Check battle history
    const battleHistory = await prisma.battleHistory.findUnique({
      where: { battleId: battle.id }
    });

    if (battleHistory) {
      console.log("\n📚 BATTLE HISTORY:");
      console.log(`   Total Participants: ${battleHistory.totalParticipants}`);
      console.log(`   Total Casts: ${battleHistory.totalCasts}`);
      console.log(`   Winner Address: ${battleHistory.winnerAddress || 'null'}`);
      console.log(`   Completed At: ${battleHistory.completedAt}`);
    }

    console.log("\n🔍 ANALYSIS:");
    if (battle.status === 'COMPLETED' && battle.winners.length === 0) {
      console.log("   ⚠️ ISSUE: Battle marked as COMPLETED but no winner record");
      console.log("   This confirms the winner creation process is still failing");
    } else if (battle.status === 'COMPLETED' && battle.winners.length > 0) {
      console.log("   ✅ SUCCESS: Battle completed with winner!");
      console.log("   The winner selection process is working correctly");
    } else {
      console.log(`   📊 Battle status: ${battle.status}`);
    }

  } catch (error) {
    console.error("❌ Analysis failed:", error);
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
