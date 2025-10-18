import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 ANALYZING SPECIFIC BITCOIN & POLITICS BATTLE");
    console.log("   The exact battle mentioned by user");
    
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

    // Root cause analysis
    console.log("\n🔍 ROOT CAUSE ANALYSIS:");

    if (battle.status === 'COMPLETED' && battle.winners.length === 0) {
      console.log("   ⚠️ ISSUE: Battle marked as COMPLETED but has no winners");
      console.log("   🔍 POSSIBLE CAUSES:");
      console.log("      1. Battle completion worker failed to determine winner");
      console.log("      2. Winner determination logic failed");
      console.log("      3. AI judge failed to process the single cast");
      console.log("      4. Database transaction failed during winner creation");
    }

    if (battle.participants.length === 1 && battle.casts.length === 1) {
      console.log("   📊 SINGLE PARTICIPANT SCENARIO:");
      console.log("      - 1 participant joined the battle");
      console.log("      - 1 cast was submitted");
      console.log("      - This should be an automatic winner scenario");
      console.log("      - The AI judge should handle single-cast battles");
    }

    // Check insights
    console.log("\n💡 INSIGHTS:");
    if (battle.insights) {
      console.log(`   Has Insights: Yes (${battle.insights.length} characters)`);
      console.log(`   Preview: ${battle.insights.substring(0, 100)}...`);
    } else {
      console.log("   Has Insights: No");
      console.log("   ⚠️ This suggests the battle completion process didn't run properly");
    }

    // Check battle completion worker logic
    console.log("\n🔧 BATTLE COMPLETION WORKER ANALYSIS:");
    console.log("   Expected Flow:");
    console.log("   1. Worker detects expired battle with participants and casts");
    console.log("   2. Calls AI judge to determine winner");
    console.log("   3. AI judge processes casts and selects winner");
    console.log("   4. Worker creates winner record in database");
    console.log("   5. Worker updates battle status to COMPLETED");
    console.log("   6. Worker generates insights");

    console.log("\n   What Likely Happened:");
    console.log("   - Step 1: ✅ Worker detected expired battle");
    console.log("   - Step 2: ✅ Called AI judge");
    console.log("   - Step 3: ❓ AI judge may have failed or returned no winner");
    console.log("   - Step 4: ❌ No winner record created");
    console.log("   - Step 5: ✅ Battle status updated to COMPLETED");
    console.log("   - Step 6: ❌ No insights generated");

    // Check if this is a single-cast edge case
    if (battle.casts.length === 1) {
      console.log("\n🎯 SINGLE CAST EDGE CASE:");
      console.log("   This is a single-cast battle, which should be handled specially:");
      console.log("   - AI judge should recognize single cast scenario");
      console.log("   - Single cast should automatically win");
      console.log("   - Winner should be created in database");
      console.log("   - Insights should be generated");
      
      console.log("\n   Possible Issues:");
      console.log("   1. AI judge doesn't handle single-cast scenario properly");
      console.log("   2. Winner creation logic fails for single cast");
      console.log("   3. Database constraint prevents winner creation");
      console.log("   4. Worker crashes after marking battle as COMPLETED");
    }

    console.log("\n🔧 DEBUGGING RECOMMENDATIONS:");
    console.log("   1. Check battle completion worker logs");
    console.log("   2. Verify AI judge handles single-cast scenarios");
    console.log("   3. Check database constraints on winner creation");
    console.log("   4. Verify worker doesn't crash after status update");
    console.log("   5. Check if insights generation fails silently");

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
