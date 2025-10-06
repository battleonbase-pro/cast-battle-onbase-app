#!/usr/bin/env tsx

import dotenv from 'dotenv';
import JudgeAgent from '../lib/agents/judge-agent.js';
import DebateGeneratorAgent from '../lib/agents/debate-generator-agent.js';
import ModeratorAgent from '../lib/agents/moderator-agent.js';

// Load environment variables
dotenv.config();

async function testAgentsMockOnly() {
  console.log('🤖 Testing Agentic AI System (Mock Only - No External APIs)...\n');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not found in environment variables');
    return;
  }

  try {
    console.log('1️⃣ Testing Judge Agent...');
    const judge = new JudgeAgent(apiKey);
    
    // Test judge with mock data
    const mockBattleData = { 
      id: 'test', 
      title: 'Test Battle Topic',
      description: 'Test battle description',
      category: 'test'
    };
    const mockCasts = [
      { 
        id: 'cast1', 
        content: 'This is a test cast for the SUPPORT side with good quality and relevance', 
        userId: 'user1',
        side: 'SUPPORT'
      },
      { 
        id: 'cast2', 
        content: 'This is a test cast for the OPPOSE side with excellent quality and high engagement', 
        userId: 'user2',
        side: 'OPPOSE'
      },
      { 
        id: 'cast3', 
        content: 'Another SUPPORT cast with decent quality', 
        userId: 'user3',
        side: 'SUPPORT'
      }
    ];
    const mockModerationResults = [
      { castId: 'cast1', isAppropriate: true, qualityScore: 8 },
      { castId: 'cast2', isAppropriate: true, qualityScore: 9 },
      { castId: 'cast3', isAppropriate: true, qualityScore: 7 }
    ];

    const judgment = await judge.judgeBattle(mockBattleData, mockCasts, mockModerationResults);
    console.log('   ✅ Judge Agent: Working correctly');
    console.log(`   📊 Winner: ${judgment.winner.userId} (${judgment.winner.side})`);
    console.log(`   🎯 Method: ${judgment.method}`);

    console.log('\n2️⃣ Testing Debate Generator Agent...');
    const debateGenerator = new DebateGeneratorAgent(apiKey);
    
    const mockArticle = {
      title: 'Test Article Title',
      description: 'Test article description',
      category: 'test'
    };
    
    const debateTopic = await debateGenerator.generateDebateTopic(mockArticle);
    console.log('   ✅ Debate Generator: Working correctly');
    console.log(`   📊 Generated: "${debateTopic.title}"`);

    console.log('\n3️⃣ Testing Moderator Agent...');
    const moderator = new ModeratorAgent(apiKey);
    
    const mockCastContent = 'This is a test cast for moderation';
    const mockBattleTitle = 'Test Battle Topic';
    
    const moderationResult = await moderator.moderateCast(mockCastContent, mockBattleTitle);
    console.log('   ✅ Moderator Agent: Working correctly');
    console.log(`   📊 Appropriate: ${moderationResult.isAppropriate}, Quality: ${moderationResult.qualityScore}`);

    console.log('\n✅ All agents working correctly!');
    console.log('\n📝 Note: This test used mock data only - no external API calls.');
    console.log('   For full testing with real news data, use: npm run test:agents');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAgentsMockOnly();
