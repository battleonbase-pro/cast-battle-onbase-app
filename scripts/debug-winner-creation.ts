import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 DEBUGGING WINNER CREATION ISSUE");
    console.log("   Analyzing the specific Bitcoin & Politics battle");
    
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

    console.log("\n📊 BATTLE ANALYSIS:");
    console.log(`   ID: ${battle.id}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Participants: ${battle.participants.length}`);
    console.log(`   Casts: ${battle.casts.length}`);
    console.log(`   Winners: ${battle.winners.length}`);

    if (battle.casts.length > 0) {
      const cast = battle.casts[0];
      console.log("\n💬 CAST ANALYSIS:");
      console.log(`   Cast ID: ${cast.id}`);
      console.log(`   User ID: ${cast.userId}`);
      console.log(`   User Address: ${cast.user.address}`);
      console.log(`   Side: ${cast.side}`);
      console.log(`   Content: ${cast.content.substring(0, 100)}...`);
      console.log(`   Likes: ${cast._count.likes}`);

      // Simulate what the AI judge would return
      console.log("\n🤖 AI JUDGE SIMULATION:");
      const simulatedWinner = {
        ...cast,
        selectionMethod: 'single-participant',
        selectionReason: 'Only 1 cast submitted - automatic winner',
        qualityScore: 8.5,
        relevanceScore: 7.2,
        engagementScore: 6.8,
        likeScore: 5.0,
        totalScore: 7.5
      };

      console.log("   Simulated Winner Object:");
      console.log(`     id: ${simulatedWinner.id}`);
      console.log(`     userId: ${simulatedWinner.userId}`);
      console.log(`     selectionMethod: ${simulatedWinner.selectionMethod}`);
      console.log(`     totalScore: ${simulatedWinner.totalScore}`);

      // Test winner creation data structure
      console.log("\n🏆 WINNER CREATION TEST:");
      const winnerData = {
        userId: simulatedWinner.userId,
        position: 1,
        prize: 'Winner of the battle'
      };

      console.log("   Winner Data for Database:");
      console.log(`     userId: ${winnerData.userId}`);
      console.log(`     position: ${winnerData.position}`);
      console.log(`     prize: ${winnerData.prize}`);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: winnerData.userId }
      });

      console.log("\n👤 USER VERIFICATION:");
      if (user) {
        console.log(`   ✅ User exists: ${user.address}`);
        console.log(`   User ID: ${user.id}`);
      } else {
        console.log(`   ❌ User not found with ID: ${winnerData.userId}`);
      }

      // Test database constraints
      console.log("\n🔧 DATABASE CONSTRAINT TEST:");
      try {
        // Try to create a test winner record
        const testWinner = await prisma.battleWin.create({
          data: {
            battleId: battle.id,
            userId: winnerData.userId,
            position: winnerData.position,
            prize: winnerData.prize
          }
        });
        console.log(`   ✅ Test winner creation successful: ${testWinner.id}`);
        
        // Clean up test record
        await prisma.battleWin.delete({
          where: { id: testWinner.id }
        });
        console.log(`   🧹 Test record cleaned up`);
      } catch (error) {
        console.log(`   ❌ Test winner creation failed:`, error);
      }

      // Check for existing winners
      console.log("\n🔍 EXISTING WINNERS CHECK:");
      const existingWinners = await prisma.battleWin.findMany({
        where: { battleId: battle.id }
      });
      console.log(`   Existing winners: ${existingWinners.length}`);
      existingWinners.forEach((winner, index) => {
        console.log(`   ${index + 1}. Winner ID: ${winner.id}, User ID: ${winner.userId}, Position: ${winner.position}`);
      });

      // Check battle history
      console.log("\n📚 BATTLE HISTORY CHECK:");
      const battleHistory = await prisma.battleHistory.findUnique({
        where: { battleId: battle.id }
      });
      if (battleHistory) {
        console.log(`   ✅ Battle history exists`);
        console.log(`   Total Participants: ${battleHistory.totalParticipants}`);
        console.log(`   Total Casts: ${battleHistory.totalCasts}`);
        console.log(`   Winner Address: ${battleHistory.winnerAddress}`);
      } else {
        console.log(`   ❌ No battle history found`);
      }

    }

    console.log("\n🔍 ROOT CAUSE ANALYSIS:");
    console.log("   Possible Issues:");
    console.log("   1. Winner object from AI judge missing userId field");
    console.log("   2. Database constraint preventing winner creation");
    console.log("   3. Silent error in battle completion process");
    console.log("   4. User ID mismatch between cast and user records");

  } catch (error) {
    console.error("❌ Debug analysis failed:", error);
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
