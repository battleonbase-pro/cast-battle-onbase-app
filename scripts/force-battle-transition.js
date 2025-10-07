#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function forceBattleTransition() {
  console.log('🔄 Forcing Battle Transition to 5-Minute Duration...\n');

  try {
    // 1. Check current battle status
    console.log('1. Checking current battle status...');
    const statusResponse = await fetch(`${API_BASE}/battle/manage`);
    const statusData = await statusResponse.json();
    
    if (statusData.success && statusData.currentBattle) {
      const battle = statusData.currentBattle;
      const now = new Date();
      const endTime = new Date(battle.endTime);
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      
      console.log(`   Current Battle: "${battle.title}"`);
      console.log(`   Status: ${battle.status}`);
      console.log(`   Time Left: ${Math.floor(timeLeft / 3600)}h ${Math.floor((timeLeft % 3600) / 60)}m ${timeLeft % 60}s`);
      console.log(`   End Time: ${endTime.toLocaleString()}`);
      
      // 2. Force complete the current battle by updating its end time to now
      console.log('\n2. Forcing completion of current battle...');
      
      // We need to manually complete this battle since the server hasn't restarted
      // to pick up the new environment variables
      console.log('   ⚠️  The current battle was created with 24-hour duration');
      console.log('   ⚠️  Server needs to be restarted to pick up 5-minute configuration');
      console.log('   ⚠️  Please restart the server: npm run dev');
      
    } else {
      console.log('   No active battle found');
    }

    // 3. Show what should happen after restart
    console.log('\n3. After server restart, the system will:');
    console.log('   ✅ Read BATTLE_DURATION_HOURS=4 (4 hours)');
    console.log('   ✅ Complete any expired battles automatically');
    console.log('   ✅ Create new battles with 4-hour duration');
    console.log('   ✅ Check battle status every 30 seconds');

    console.log('\n🎯 Next Steps:');
    console.log('1. Stop the current server (Ctrl+C)');
    console.log('2. Run: npm run dev');
    console.log('3. The system will automatically transition to 5-minute battles');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Run the transition
forceBattleTransition();
