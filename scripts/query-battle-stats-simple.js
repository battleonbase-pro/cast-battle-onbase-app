const { Client } = require('pg');
const { execSync } = require('child_process');

// Get production database URL from GCP secrets
function getProductionDatabaseUrl() {
  try {
    const dbUrl = execSync('gcloud secrets versions access latest --secret="database-url"', { encoding: 'utf-8' }).trim();
    return dbUrl;
  } catch (error) {
    console.error('Failed to get database URL from GCP secrets:', error.message);
    process.exit(1);
  }
}

async function queryBattleStats() {
  const battleTitle = "AI Euphoria: Justified or Overhyped";
  const databaseUrl = getProductionDatabaseUrl();
  
  console.log(`🔍 Connecting to production database...`);
  console.log(`🔍 Searching for battle: "${battleTitle}"`);
  
  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database\n');

    // Find the battle
    const battleResult = await client.query(`
      SELECT id, title, status, "createdAt", "startTime", "endTime"
      FROM battles
      WHERE title ILIKE $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [`%${battleTitle}%`]);

    if (battleResult.rows.length === 0) {
      console.log('❌ Battle not found');
      
      // Try to find similar battles
      const similarResult = await client.query(`
        SELECT id, title, status, "createdAt"
        FROM battles
        WHERE title ILIKE '%AI Euphoria%'
        ORDER BY "createdAt" DESC
        LIMIT 5
      `);
      
      if (similarResult.rows.length > 0) {
        console.log('\n📋 Found similar battles:');
        similarResult.rows.forEach(b => {
          console.log(`  - ${b.title} (${b.status}) - Created: ${b.createdAt}`);
        });
      }
      
      await client.end();
      return;
    }

    const battle = battleResult.rows[0];
    console.log('✅ Battle found!');
    console.log(`\n📊 Battle Details:`);
    console.log(`   ID: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Created: ${battle.createdAt}`);
    console.log(`   Start Time: ${battle.startTime}`);
    console.log(`   End Time: ${battle.endTime}`);

    // Count participants
    const participantsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM battle_participations
      WHERE "battleId" = $1
    `, [battle.id]);
    
    const participantCount = parseInt(participantsResult.rows[0].count);
    console.log(`\n👥 Participants:`);
    console.log(`   Total: ${participantCount}`);

    // Count casts by side
    const castsResult = await client.query(`
      SELECT side, COUNT(*) as count
      FROM casts
      WHERE "battleId" = $1
      GROUP BY side
    `, [battle.id]);

    const supportCasts = castsResult.rows.find(r => r.side === 'SUPPORT')?.count || 0;
    const opposeCasts = castsResult.rows.find(r => r.side === 'OPPOSE')?.count || 0;
    const totalCasts = parseInt(supportCasts) + parseInt(opposeCasts);

    console.log(`\n💬 Casts:`);
    console.log(`   Total: ${totalCasts}`);
    console.log(`   Support (In Favor): ${supportCasts}`);
    console.log(`   Oppose (Against): ${opposeCasts}`);

    if (totalCasts > 0) {
      const supportPercent = Math.round((parseInt(supportCasts) / totalCasts) * 100);
      const opposePercent = Math.round((parseInt(opposeCasts) / totalCasts) * 100);
      console.log(`\n📈 Sentiment Breakdown:`);
      console.log(`   Support: ${supportPercent}%`);
      console.log(`   Oppose: ${opposePercent}%`);
    }

    // Check battle history
    const historyResult = await client.query(`
      SELECT "completedAt", "totalParticipants", "totalCasts", "winnerAddress"
      FROM battle_history
      WHERE "battleId" = $1
    `, [battle.id]);

    if (historyResult.rows.length > 0) {
      const history = historyResult.rows[0];
      console.log(`\n📜 Battle History:`);
      console.log(`   Completed At: ${history.completedAt}`);
      console.log(`   Total Participants: ${history.totalParticipants}`);
      console.log(`   Total Casts: ${history.totalCasts}`);
      if (history.winnerAddress) {
        console.log(`   Winner: ${history.winnerAddress}`);
      }
    }

    // Show some sample casts
    const sampleCastsResult = await client.query(`
      SELECT side, content
      FROM casts
      WHERE "battleId" = $1
      ORDER BY "createdAt" ASC
      LIMIT 3
    `, [battle.id]);

    if (sampleCastsResult.rows.length > 0) {
      console.log(`\n📝 Sample Casts (first 3):`);
      sampleCastsResult.rows.forEach((cast, index) => {
        const content = cast.content.length > 60 ? cast.content.substring(0, 60) + '...' : cast.content;
        console.log(`   ${index + 1}. [${cast.side}] ${content}`);
      });
    }

  } catch (error) {
    console.error('❌ Error querying battle:', error.message);
  } finally {
    await client.end();
  }
}

queryBattleStats();

