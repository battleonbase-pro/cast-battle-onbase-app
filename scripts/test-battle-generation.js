#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testBattleGeneration() {
  console.log('🧪 Testing Battle Generation System...\n');

  try {
    // 1. Initialize the battle manager
    console.log('1. Initializing battle manager...');
    const initResponse = await fetch(`${API_BASE}/init`, { method: 'POST' });
    const initData = await initResponse.json();
    
    if (initData.success) {
      console.log('✅ Battle manager initialized successfully');
      console.log(`   Duration: ${initData.config.battleDurationHours} hours`);
      console.log(`   Enabled: ${initData.config.enabled}`);
    } else {
      console.log('❌ Failed to initialize battle manager');
      return;
    }

    // 2. Get current battle status
    console.log('\n2. Checking current battle status...');
    const statusResponse = await fetch(`${API_BASE}/battle/manage`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('✅ Battle status retrieved');
      if (statusData.currentBattle) {
        console.log(`   Current Battle: ${statusData.currentBattle.title}`);
        console.log(`   Status: ${statusData.currentBattle.status}`);
        console.log(`   Ends at: ${new Date(statusData.currentBattle.endTime).toLocaleString()}`);
      } else {
        console.log('   No active battle found');
      }
    } else {
      console.log('❌ Failed to get battle status');
    }

    // 3. Manually trigger battle generation
    console.log('\n3. Manually triggering battle generation...');
    const triggerResponse = await fetch(`${API_BASE}/battle/manage`, { method: 'DELETE' });
    const triggerData = await triggerResponse.json();
    
    if (triggerData.success) {
      console.log('✅ Battle generation triggered successfully');
      if (triggerData.currentBattle) {
        console.log(`   New Battle: ${triggerData.currentBattle.title}`);
        console.log(`   Ends at: ${new Date(triggerData.currentBattle.endTime).toLocaleString()}`);
      }
    } else {
      console.log('❌ Failed to trigger battle generation');
      console.log(`   Error: ${triggerData.error}`);
    }

    // 4. Test automatic generation by checking multiple times
    console.log('\n4. Testing automatic generation (checking every 10 seconds)...');
    console.log('   This will run for 1 minute to test the 30-second check interval...');
    
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const checkResponse = await fetch(`${API_BASE}/battle/current`);
      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.battle) {
        const battle = checkData.battle;
        const now = new Date();
        const endTime = new Date(battle.endTime);
        const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        
        console.log(`   Check ${i + 1}: Battle "${battle.title}" - ${timeLeft}s remaining`);
      } else {
        console.log(`   Check ${i + 1}: No active battle`);
      }
    }

    console.log('\n🎉 Battle generation test completed!');
    console.log('\n📋 Summary:');
    console.log('- Battle manager should be initialized');
    console.log('- Automatic generation should be running');
    console.log('- Battles should be created every 5 minutes (0.083333 hours)');
    console.log('- Status checks should run every 30 seconds');
    console.log('- Expired battles should be completed and new ones created immediately');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Run the test
testBattleGeneration();
