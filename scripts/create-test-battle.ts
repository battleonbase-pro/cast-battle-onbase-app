import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestBattle() {
  try {
    console.log("🎯 Creating test battle for end-to-end testing...");
    
    // Create a test battle
    const battle = await prisma.battle.create({
      data: {
        title: "Test Debate: Should AI be regulated?",
        description: "This is a test debate to verify the end-to-end flow with the new DebatePoolV2 contract.",
        category: "Technology",
        source: "Test Source",
        sourceUrl: "https://example.com",
        startTime: new Date(),
        endTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        durationHours: 0.083, // 5 minutes
        status: 'ACTIVE',
        maxParticipants: 10,
        debatePoints: {
          support: [],
          oppose: []
        }
      }
    });
    
    console.log(`✅ Test battle created with ID: ${battle.id}`);
    console.log(`📋 Title: ${battle.title}`);
    console.log(`⏰ End time: ${battle.endTime.toISOString()}`);
    console.log(`👥 Max participants: ${battle.maxParticipants}`);
    
    // Check if we can fetch it via API
    console.log("\n🔍 Testing API endpoint...");
    const response = await fetch('http://localhost:3000/api/battle/current');
    const data = await response.json();
    
    if (data.success && data.battle) {
      console.log("✅ API endpoint working correctly");
      console.log(`📋 API returned battle: ${data.battle.title}`);
    } else {
      console.log("❌ API endpoint issue:", data.error);
    }
    
    console.log("\n🎉 End-to-end test setup complete!");
    console.log("📋 Next steps:");
    console.log("1. Open http://localhost:3000 in browser");
    console.log("2. Sign in with Base Account");
    console.log("3. Submit a debate argument");
    console.log("4. Verify payment flow works");
    console.log("5. Check if argument appears in UI");
    
  } catch (error) {
    console.error("❌ Test battle creation failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBattle();
