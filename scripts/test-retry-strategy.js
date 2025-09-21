#!/usr/bin/env node

/**
 * Test script to verify the improved retry strategy for topic generation
 */

import newsService from '../lib/services/news-service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRetryStrategy() {
  console.log('🧪 Testing Improved Retry Strategy...\n');
  
  // Use the singleton instance
  
  console.log('📝 Testing topic generation with retry strategy...');
  console.log('   This will show how the system tries different strategies when similarity is high.\n');
  
  try {
    const topic = await newsService.getDailyBattleTopic();
    console.log('✅ Successfully generated topic:', topic.title);
    console.log('   Category:', topic.category);
    console.log('   Source:', topic.source);
  } catch (error) {
    console.log('❌ Failed to generate topic:', error.message);
  }
  
  console.log('\n🏁 Retry Strategy Test Complete');
}

// Run the test
testRetryStrategy().catch(console.error);
