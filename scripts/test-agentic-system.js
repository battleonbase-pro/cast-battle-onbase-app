import dotenv from 'dotenv';
import AgentOrchestrator from '../lib/agents/agent-orchestrator.js';

// Load environment variables
dotenv.config();

async function testAgenticSystem() {
  console.log('🤖 Testing Agentic AI System...\n');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
    console.log('❌ Please set your GOOGLE_GENERATIVE_AI_API_KEY in the .env file');
    console.log('   1. Go to: https://makersuite.google.com/app/apikey');
    console.log('   2. Create a new API key');
    console.log('   3. Add it to your .env file\n');
    return;
  }

  try {
    // Initialize Agent Orchestrator
    console.log('1️⃣ Initializing Agent Orchestrator...');
    const orchestrator = new AgentOrchestrator(apiKey);
    
    // Test all agents
    console.log('2️⃣ Testing all agents...');
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

    // Test daily battle topic generation
    console.log('\n3️⃣ Testing daily battle topic generation...');
    const battleTopicResult = await orchestrator.generateDailyBattleTopic();
    
    console.log('\n🎯 Generated Battle Topic:');
    console.log(`   Title: ${battleTopicResult.debateTopic.title}`);
    console.log(`   Description: ${battleTopicResult.debateTopic.description}`);
    console.log(`   Category: ${battleTopicResult.debateTopic.category}`);
    console.log(`   Source: ${battleTopicResult.debateTopic.source}`);
    
    console.log('\n💬 Debate Points:');
    Object.entries(battleTopicResult.debateTopic.debatePoints).forEach(([side, points]) => {
      console.log(`   ${side}:`);
      points.forEach(point => {
        console.log(`     • ${point}`);
      });
    });

    console.log('\n📈 Quality Analysis:');
    console.log(`   Overall Score: ${battleTopicResult.qualityAnalysis.overallScore}/10`);
    console.log(`   Balance Score: ${battleTopicResult.qualityAnalysis.balanceScore}/10`);
    console.log(`   Complexity: ${battleTopicResult.debateTopic.complexity}`);
    console.log(`   Controversy Level: ${battleTopicResult.debateTopic.controversyLevel}`);

    console.log('\n✅ Agentic AI System Test Complete!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Visit: http://localhost:3000');
    console.log('   3. Test the Farcaster Frame endpoints');
    console.log('   4. Deploy smart contracts: npm run deploy:testnet');

  } catch (error) {
    console.error('\n❌ Error testing agentic system:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your GOOGLE_GENERATIVE_AI_API_KEY');
    console.log('   2. Ensure NEWS_API_KEY is set');
    console.log('   3. Check your internet connection');
    console.log('   4. Verify API key permissions');
  }
}

// Run the test
testAgenticSystem();
