import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Get production database URL from GCP secrets
function getProductionDatabaseUrl(): string {
  try {
    const dbUrl = execSync('gcloud secrets versions access latest --secret="database-url"', { encoding: 'utf-8' }).trim();
    return dbUrl;
  } catch (error) {
    console.error('Failed to get database URL from GCP secrets:', error);
    process.exit(1);
  }
}

const databaseUrl = process.env.DATABASE_URL || getProductionDatabaseUrl();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function queryBattleStats() {
  const battleTitle = "AI Euphoria: Justified or Overhyped";
  
  console.log(`🔍 Searching for battle: "${battleTitle}"`);
  
  try {
    // Find the battle
    const battle = await prisma.battle.findFirst({
      where: {
        title: {
          contains: battleTitle,
          mode: 'insensitive'
        }
      },
      include: {
        participants: true,
        casts: true,
        history: true
      }
    });

    if (!battle) {
      console.log('❌ Battle not found');
      
      // Try to find any battle with similar title
      const similarBattles = await prisma.battle.findMany({
        where: {
          title: {
            contains: 'AI Euphoria',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
      
      if (similarBattles.length > 0) {
        console.log('\n📋 Found similar battles:');
        similarBattles.forEach(b => {
          console.log(`  - ${b.title} (${b.status}) - Created: ${b.createdAt}`);
        });
      }
      
      return;
    }

    console.log('\n✅ Battle found!');
    console.log(`\n📊 Battle Details:`);
    console.log(`   ID: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Created: ${battle.createdAt}`);
    console.log(`   Start Time: ${battle.startTime}`);
    console.log(`   End Time: ${battle.endTime}`);

    // Count participants
    const participantCount = battle.participants.length;
    console.log(`\n👥 Participants:`);
    console.log(`   Total: ${participantCount}`);

    // Count casts by side
    const supportCasts = battle.casts.filter(c => c.side === 'SUPPORT');
    const opposeCasts = battle.casts.filter(c => c.side === 'OPPOSE');
    const totalCasts = battle.casts.length;

    console.log(`\n💬 Casts:`);
    console.log(`   Total: ${totalCasts}`);
    console.log(`   Support (In Favor): ${supportCasts.length}`);
    console.log(`   Oppose (Against): ${opposeCasts.length}`);

    if (totalCasts > 0) {
      const supportPercent = Math.round((supportCasts.length / totalCasts) * 100);
      const opposePercent = Math.round((opposeCasts.length / totalCasts) * 100);
      console.log(`\n📈 Sentiment Breakdown:`);
      console.log(`   Support: ${supportPercent}%`);
      console.log(`   Oppose: ${opposePercent}%`);
    }

    // Check if battle has history
    if (battle.history) {
      console.log(`\n📜 Battle History:`);
      console.log(`   Completed At: ${battle.history.completedAt}`);
      console.log(`   Total Participants: ${battle.history.totalParticipants}`);
      console.log(`   Total Casts: ${battle.history.totalCasts}`);
      if (battle.history.winnerAddress) {
        console.log(`   Winner: ${battle.history.winnerAddress}`);
      }
    }

    // Show some sample casts
    if (battle.casts.length > 0) {
      console.log(`\n📝 Sample Casts (first 3):`);
      battle.casts.slice(0, 3).forEach((cast, index) => {
        console.log(`   ${index + 1}. [${cast.side}] ${cast.content.substring(0, 60)}...`);
      });
    }

  } catch (error) {
    console.error('❌ Error querying battle:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryBattleStats();

