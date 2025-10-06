#!/usr/bin/env tsx

import dotenv from 'dotenv';
import AgentOrchestrator from '../lib/agents/agent-orchestrator.js';

// Load environment variables
dotenv.config();

async function testAgentsFast() {
  console.log('🤖 Testing Agentic AI System (Fast Mode - No API Calls)...\n');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not found in environment variables');
    return;
  }

  try {
    // Initialize Agent Orchestrator
    console.log('1️⃣ Initializing Agent Orchestrator...');
    const orchestrator = new AgentOrchestrator(apiKey);
    
    // Test all agents with mock data (no API calls)
    console.log('2️⃣ Testing all agents with mock data...');
    const agentTestResults = await orchestrator.testAllAgents();
    
    console.log('\n📊 Agent Test Results:');
    Object.entries(agentTestResults.results).forEach(([agentName, result]) => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`   ${status} ${agentName}: ${result.status}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    if (!agentTestResults.allSuccessful) {
      console.log('\n❌ Some agents failed. Please check your API key and try again.');
      return;
    }

    console.log('\n✅ All agents working correctly!');
    console.log('\n📝 Note: This test used mock data to avoid API rate limits.');
    console.log('   For full testing with real news data, use: npm run test:agents');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAgentsFast();
