import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 SIMULATING BATTLE COMPLETION PROCESS");
    console.log("   Testing the exact logic that failed");
    
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

    console.log("\n📊 BATTLE DATA:");
    console.log(`   ID: ${battle.id}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Casts: ${battle.casts.length}`);

    // Simulate the AI judge process
    console.log("\n🤖 SIMULATING AI JUDGE PROCESS:");
    
    const cast = battle.casts[0];
    
    // Simulate what selectOptimizedHybridWinner returns for single cast
    const simulatedWinner = {
      id: cast.id,
      userId: cast.userId,
      side: cast.side,
      content: cast.content,
      selectionMethod: 'single-participant',
      selectionReason: 'Only 1 cast submitted - automatic winner',
      qualityScore: 8.5,
      relevanceScore: 7.2,
      engagementScore: 6.8,
      likeScore: 5.0,
      totalScore: 7.5,
      groupAnalysis: {
        winningSide: cast.side,
        supportScore: cast.side === 'SUPPORT' ? 7.5 : 0,
        opposeScore: cast.side === 'OPPOSE' ? 7.5 : 0,
        top3Candidates: [{
          id: cast.id,
          score: '7.50',
          content: cast.content.substring(0, 50) + '...'
        }]
      }
    };

    // Simulate what generateOptimizedHybridJudgment returns
    const simulatedJudgmentDetails = {
      method: 'optimized-hybrid',
      summary: `The ${cast.side} side won with an average score of 7.5. Winner selected from single cast using optimized scoring.`,
      fairness: 'Selection based on objective scoring criteria',
      transparency: 'Non-LLM scoring with transparent criteria',
      insights: 'Single cast scenario - automatic winner selection based on quality, relevance, engagement, and like scores.',
      groupAnalysis: simulatedWinner.groupAnalysis,
      scoringMethod: 'Non-LLM quality, relevance, engagement, and originality scoring',
      selectionMethod: 'Single cast automatic winner'
    };

    // Simulate what judgeBattle returns
    const simulatedJudgment = {
      battleId: battle.id,
      winner: simulatedWinner,
      judgmentDetails: simulatedJudgmentDetails,
      castCount: 1,
      appropriateCastCount: 1,
      winnerMethod: 'hybrid',
      judgedBy: 'JudgeAgent',
      judgedAt: new Date().toISOString()
    };

    // Simulate what completeBattle returns
    const simulatedResult = {
      workflowId: `battle_completion_${Date.now()}`,
      battleData: battle,
      moderationResults: { results: [] },
      judgment: simulatedJudgment,
      statistics: {},
      completedAt: new Date().toISOString(),
      agents: {
        moderator: 'ModeratorAgent',
        judge: 'JudgeAgent'
      }
    };

    console.log("   Simulated Result Structure:");
    console.log(`     ✅ result: ${!!simulatedResult}`);
    console.log(`     ✅ result.judgment: ${!!simulatedResult.judgment}`);
    console.log(`     ✅ result.judgment.winner: ${!!simulatedResult.judgment.winner}`);
    console.log(`     ✅ result.judgment.winner.userId: ${simulatedResult.judgment.winner.userId}`);

    // Test the exact condition from battle completion
    console.log("\n🏆 TESTING BATTLE COMPLETION CONDITION:");
    
    if (simulatedResult && simulatedResult.judgment && simulatedResult.judgment.winner) {
      console.log("   ✅ Condition passed: result && result.judgment && result.judgment.winner");
      
      const winner = simulatedResult.judgment.winner;
      console.log(`   ✅ Winner object: ${JSON.stringify(winner, null, 2)}`);
      
      const winners = [{
        userId: winner.userId,
        position: 1,
        prize: 'Winner of the battle'
      }];

      console.log("   ✅ Winner data for database:");
      console.log(`     userId: ${winners[0].userId}`);
      console.log(`     position: ${winners[0].position}`);
      console.log(`     prize: ${winners[0].prize}`);

      // Test database insertion
      console.log("\n🔧 TESTING DATABASE INSERTION:");
      try {
        const testWinner = await prisma.battleWin.create({
          data: {
            battleId: battle.id,
            userId: winners[0].userId,
            position: winners[0].position,
            prize: winners[0].prize
          }
        });
        console.log(`   ✅ Winner record created successfully: ${testWinner.id}`);
        
        // Clean up
        await prisma.battleWin.delete({
          where: { id: testWinner.id }
        });
        console.log(`   🧹 Test record cleaned up`);
      } catch (error) {
        console.log(`   ❌ Database insertion failed:`, error);
      }

    } else {
      console.log("   ❌ Condition failed: result && result.judgment && result.judgment.winner");
      console.log(`     result: ${!!simulatedResult}`);
      console.log(`     result.judgment: ${!!simulatedResult.judgment}`);
      console.log(`     result.judgment.winner: ${!!simulatedResult.judgment.winner}`);
    }

    // Check what might have gone wrong
    console.log("\n🔍 POTENTIAL ISSUES:");
    console.log("   1. AI judge might have returned null/undefined winner");
    console.log("   2. Winner object might be missing userId field");
    console.log("   3. Database transaction might have failed silently");
    console.log("   4. Worker might have crashed after condition check");

    // Test with actual battle data
    console.log("\n🎯 TESTING WITH ACTUAL BATTLE DATA:");
    
    // Check if we can manually create the winner now
    try {
      const manualWinner = await prisma.battleWin.create({
        data: {
          battleId: battle.id,
          userId: cast.userId,
          position: 1,
          prize: 'Winner of the battle'
        }
      });
      console.log(`   ✅ Manual winner creation successful: ${manualWinner.id}`);
      
      // Update battle history
      await prisma.battleHistory.update({
        where: { battleId: battle.id },
        data: {
          winnerAddress: cast.user.address
        }
      });
      console.log(`   ✅ Battle history updated with winner address`);
      
      // Update battle with insights
      await prisma.battle.update({
        where: { id: battle.id },
        data: {
          insights: 'Single cast scenario - automatic winner selection based on quality, relevance, engagement, and like scores.'
        }
      });
      console.log(`   ✅ Battle updated with insights`);
      
      console.log("\n🎉 MANUAL FIX COMPLETED!");
      console.log("   The battle now has:");
      console.log("   ✅ Winner record created");
      console.log("   ✅ Battle history updated");
      console.log("   ✅ Insights generated");
      
    } catch (error) {
      console.log(`   ❌ Manual fix failed:`, error);
    }

  } catch (error) {
    console.error("❌ Simulation failed:", error);
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
