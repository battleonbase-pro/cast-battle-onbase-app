#!/usr/bin/env node

/**
 * Test script to debug AI similarity calculation issues
 */

import AgentOrchestrator from '../lib/agents/agent-orchestrator.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAISimilarity() {
  console.log('🧪 Testing AI Similarity Calculation...\n');
  
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not found in environment');
    process.exit(1);
  }

  const agentOrchestrator = new AgentOrchestrator(apiKey);
  
  // Test cases with different topic pairs
  const testCases = [
    {
      topic1: "Is escalating military action in Ukraine justified?",
      topic2: "Should we increase military aid to Ukraine?",
      expected: "Similar topics about Ukraine military aid"
    },
    {
      topic1: "Is escalating military action in Ukraine justified?",
      topic2: "What's the best pizza topping?",
      expected: "Completely different topics"
    },
    {
      topic1: "Climate change is the biggest threat to humanity",
      topic2: "Global warming requires immediate action",
      expected: "Similar topics about climate change"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📝 Test Case ${i + 1}: ${testCase.expected}`);
    console.log(`   Topic 1: "${testCase.topic1}"`);
    console.log(`   Topic 2: "${testCase.topic2}"`);
    
    try {
      const prompt = `Compare these two debate topics and return a similarity score from 0.0 to 1.0:

Topic 1: "${testCase.topic1}"
Topic 2: "${testCase.topic2}"

Consider:
- Core concepts and themes
- Subject matter overlap
- Debate angle similarity
- Overall topic scope

Return only a number between 0.0 and 1.0 (e.g., 0.85 for very similar, 0.15 for very different):`;

      console.log('   🤖 Sending prompt to AI...');
      const response = await agentOrchestrator.generateText(prompt);
      
      console.log(`   📤 Raw AI Response: "${response}"`);
      console.log(`   📤 Response Type: ${typeof response}`);
      console.log(`   📤 Response Length: ${String(response).length}`);
      
      // Test different parsing approaches
      const responseStr = String(response).trim();
      console.log(`   🔍 Trimmed Response: "${responseStr}"`);
      
      // Try to extract number from response
      const numberMatch = responseStr.match(/(\d+\.?\d*)/);
      if (numberMatch) {
        const extractedNumber = parseFloat(numberMatch[1]);
        console.log(`   🔢 Extracted Number: ${extractedNumber}`);
        
        if (extractedNumber >= 0 && extractedNumber <= 1) {
          console.log(`   ✅ Valid similarity score: ${extractedNumber}`);
        } else {
          console.log(`   ❌ Number out of range: ${extractedNumber}`);
        }
      } else {
        console.log(`   ❌ No number found in response`);
      }
      
      // Test the actual parsing logic from the code
      try {
        const similarity = parseFloat(responseStr);
        console.log(`   🧮 parseFloat result: ${similarity}`);
        
        if (isNaN(similarity) || similarity < 0 || similarity > 1) {
          console.log(`   ❌ Invalid similarity score: ${similarity}`);
        } else {
          console.log(`   ✅ Valid similarity score: ${similarity}`);
        }
      } catch (parseError) {
        console.log(`   ❌ Parse error: ${parseError.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🏁 AI Similarity Test Complete');
}

// Run the test
testAISimilarity().catch(console.error);
