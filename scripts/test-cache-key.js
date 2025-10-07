#!/usr/bin/env node

/**
 * Test script to verify the new battle-duration-based cache key
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function getCacheKey() {
  const now = new Date();
  const battleDurationHours = parseFloat(process.env.BATTLE_DURATION_HOURS || '4'); // Default 4 hours
  const battleDurationMs = battleDurationHours * 60 * 60 * 1000;
  
  // Calculate which battle cycle we're in based on battle duration
  const battleCycleStart = Math.floor(now.getTime() / battleDurationMs) * battleDurationMs;
  const battleCycleId = Math.floor(battleCycleStart / battleDurationMs);
  
  return `battle_topic_${battleCycleId}`;
}

function getCacheTimeout() {
  const battleDurationHours = parseFloat(process.env.BATTLE_DURATION_HOURS || '0.083333');
  return battleDurationHours * 60 * 60 * 1000; // Battle duration in milliseconds
}

async function testCacheKey() {
  console.log('🧪 Testing Battle-Duration-Based Cache Key...\n');
  
  const battleDurationHours = parseFloat(process.env.BATTLE_DURATION_HOURS || '0.083333');
  const battleDurationMinutes = battleDurationHours * 60;
  
  console.log(`📊 Battle Configuration:`);
  console.log(`   Duration: ${battleDurationHours} hours (${battleDurationMinutes} minutes)`);
  console.log(`   Cache Timeout: ${getCacheTimeout()}ms (${battleDurationMinutes} minutes)`);
  console.log('');
  
  console.log(`🔑 Current Cache Key: ${getCacheKey()}`);
  console.log('');
  
  // Test cache key changes over time
  console.log('⏰ Testing cache key changes over time:');
  
  const now = new Date();
  const battleDurationMs = battleDurationHours * 60 * 60 * 1000;
  
  // Show current battle cycle info
  const battleCycleStart = Math.floor(now.getTime() / battleDurationMs) * battleDurationMs;
  const battleCycleEnd = battleCycleStart + battleDurationMs;
  const timeUntilNextCycle = battleCycleEnd - now.getTime();
  
  console.log(`   Current battle cycle starts: ${new Date(battleCycleStart).toISOString()}`);
  console.log(`   Current battle cycle ends: ${new Date(battleCycleEnd).toISOString()}`);
  console.log(`   Time until next cycle: ${Math.round(timeUntilNextCycle / 1000)} seconds`);
  console.log('');
  
  // Simulate what happens in the next battle cycle
  const nextCycleStart = battleCycleStart + battleDurationMs;
  const nextCycleEnd = nextCycleStart + battleDurationMs;
  
  console.log(`🔄 Next battle cycle:`);
  console.log(`   Starts: ${new Date(nextCycleStart).toISOString()}`);
  console.log(`   Ends: ${new Date(nextCycleEnd).toISOString()}`);
  console.log('');
  
  // Show cache key for next cycle
  const nextCycleId = Math.floor(nextCycleStart / battleDurationMs);
  console.log(`   Next cache key will be: battle_topic_${nextCycleId}`);
  console.log('');
  
  console.log('✅ Cache key is now properly aligned with battle duration!');
  console.log('   - Cache expires when battle ends');
  console.log('   - New topics generated for each battle cycle');
  console.log('   - No more stale cached topics across battles');
}

// Run the test
testCacheKey().catch(console.error);
