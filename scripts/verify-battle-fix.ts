import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 VERIFYING MANUAL FIX");
    console.log("   Checking if the battle now has winner and insights");
    
    // Find the specific battle
    const battle = await prisma.battle.findFirst({
      where: {
        title: "Bitcoin & Politics: Is crypto's rally after Trump's reelection sustainable and beneficial?"
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

    console.log("\n📊 BATTLE STATUS AFTER FIX:");
    console.log(`   ID: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Participants: ${battle.participants.length}`);
    console.log(`   Casts: ${battle.casts.length}`);
    console.log(`   Winners: ${battle.winners.length}`);
    console.log(`   Insights: ${battle.insights ? 'Yes' : 'No'}`);

    if (battle.winners.length > 0) {
      console.log("\n🏆 WINNER DETAILS:");
      battle.winners.forEach((winner, index) => {
        console.log(`   ${index + 1}. Winner: ${winner.user.address}`);
        console.log(`      Position: ${winner.position}`);
        console.log(`      Prize: ${winner.prize}`);
        console.log(`      Created: ${winner.createdAt}`);
      });
    }

    if (battle.insights) {
      console.log("\n💡 INSIGHTS:");
      console.log(`   ${battle.insights}`);
    }

    // Check battle history
    const battleHistory = await prisma.battleHistory.findUnique({
      where: { battleId: battle.id }
    });

    if (battleHistory) {
      console.log("\n📚 BATTLE HISTORY:");
      console.log(`   Total Participants: ${battleHistory.totalParticipants}`);
      console.log(`   Total Casts: ${battleHistory.totalCasts}`);
      console.log(`   Winner Address: ${battleHistory.winnerAddress}`);
      console.log(`   Completed At: ${battleHistory.completedAt}`);
    }

    console.log("\n✅ FIX VERIFICATION:");
    console.log(`   Battle Status: ${battle.status} ✅`);
    console.log(`   Winner Records: ${battle.winners.length} ✅`);
    console.log(`   Insights: ${battle.insights ? 'Yes' : 'No'} ✅`);
    console.log(`   Battle History: ${battleHistory ? 'Yes' : 'No'} ✅`);

    if (battle.winners.length > 0 && battle.insights && battleHistory?.winnerAddress) {
      console.log("\n🎉 SUCCESS! The battle is now properly completed with:");
      console.log("   ✅ Winner record");
      console.log("   ✅ Insights");
      console.log("   ✅ Battle history with winner address");
      console.log("\n   The UI should now show the winner instead of 'No Winner'");
    } else {
      console.log("\n⚠️  The fix may not be complete. Some components are still missing.");
    }

  } catch (error) {
    console.error("❌ Verification failed:", error);
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
