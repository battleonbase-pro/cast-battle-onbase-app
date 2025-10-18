import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 ANALYZING BITCOIN & POLITICS BATTLE");
    console.log("   Checking database for battle completion issues");
    
    // Find the Bitcoin & Politics battle
    const battle = await prisma.battle.findFirst({
      where: {
        title: {
          contains: "Bitcoin",
          mode: 'insensitive'
        }
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
      console.log("❌ No Bitcoin & Politics battle found");
      return;
    }

    console.log("\n📊 BATTLE DETAILS:");
    console.log(`   ID: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Start Time: ${battle.startTime}`);
    console.log(`   End Time: ${battle.endTime}`);
    console.log(`   Created: ${battle.createdAt}`);
    console.log(`   Updated: ${battle.updatedAt}`);

    console.log("\n👥 PARTICIPANTS:");
    console.log(`   Count: ${battle.participants.length}`);
    battle.participants.forEach((participant, index) => {
      console.log(`   ${index + 1}. ${participant.user.address} (Joined: ${participant.createdAt})`);
    });

    console.log("\n💬 CASTS:");
    console.log(`   Count: ${battle.casts.length}`);
    battle.casts.forEach((cast, index) => {
      console.log(`   ${index + 1}. Side: ${cast.side}`);
      console.log(`      User: ${cast.user.address}`);
      console.log(`      Content: ${cast.content.substring(0, 100)}...`);
      console.log(`      Likes: ${cast._count.likes}`);
      console.log(`      Created: ${cast.createdAt}`);
    });

    console.log("\n🏆 WINNERS:");
    console.log(`   Count: ${battle.winners.length}`);
    battle.winners.forEach((winner, index) => {
      console.log(`   ${index + 1}. ${winner.user.address} (Position: ${winner.position})`);
    });

    console.log("\n🔍 ANALYSIS:");

    // Check if battle should be completed
    const now = new Date();
    const endTime = new Date(battle.endTime);
    const isExpired = now > endTime;

    console.log(`   Current Time: ${now.toISOString()}`);
    console.log(`   Battle End Time: ${endTime.toISOString()}`);
    console.log(`   Is Expired: ${isExpired}`);
    console.log(`   Time Since End: ${Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60))} minutes`);

    // Check battle completion criteria
    console.log("\n📋 COMPLETION CRITERIA:");
    console.log(`   Has Participants: ${battle.participants.length > 0}`);
    console.log(`   Has Casts: ${battle.casts.length > 0}`);
    console.log(`   Is Expired: ${isExpired}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Has Winners: ${battle.winners.length > 0}`);

    // Check if battle should be completed but isn't
    if (isExpired && battle.participants.length > 0 && battle.casts.length > 0 && battle.status !== 'COMPLETED') {
      console.log("\n⚠️ ISSUE DETECTED:");
      console.log("   Battle is expired with participants and casts but not marked as COMPLETED");
      console.log("   This suggests the battle completion worker didn't run or failed");
    }

    if (battle.status === 'COMPLETED' && battle.winners.length === 0) {
      console.log("\n⚠️ ISSUE DETECTED:");
      console.log("   Battle is marked as COMPLETED but has no winners");
      console.log("   This suggests the winner determination process failed");
    }

    // Check insights
    console.log("\n💡 INSIGHTS:");
    if (battle.insights) {
      console.log(`   Has Insights: Yes (${battle.insights.length} characters)`);
      console.log(`   Preview: ${battle.insights.substring(0, 100)}...`);
    } else {
      console.log("   Has Insights: No");
    }

    // Check for any error logs or completion issues
    console.log("\n🔧 DEBUGGING INFO:");
    console.log(`   Battle ID for worker: ${battle.id}`);
    console.log(`   Should trigger completion: ${isExpired && battle.participants.length > 0 && battle.casts.length > 0}`);

  } catch (error) {
    console.error("❌ Database analysis failed:", error);
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
