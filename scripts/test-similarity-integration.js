#!/usr/bin/env node

/**
 * Integration test for the complete similarity calculation system
 */

import AgentOrchestrator from '../lib/agents/agent-orchestrator.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class TestNewsService {
  constructor() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.agentOrchestrator = new AgentOrchestrator(apiKey);
  }

  // Copy the exact logic from NewsService.calculateAISimilarity
  async calculateAISimilarity(topic1, topic2) {
    try {
      const prompt = `Compare these two debate topics and return a similarity score from 0.0 to 1.0:

Topic 1: "${topic1}"
Topic 2: "${topic2}"

Consider:
- Core concepts and themes
- Subject matter overlap
- Debate angle similarity
- Overall topic scope

Return only a number between 0.0 and 1.0 (e.g., 0.85 for very similar, 0.15 for very different):`;

      const response = await this.agentOrchestrator.generateText(prompt);
      const similarity = parseFloat(String(response).trim());
      
      if (isNaN(similarity) || similarity < 0 || similarity > 1) {
        throw new Error('Invalid similarity score from AI');
      }
      
      return similarity;

    } catch (error) {
      console.error('[Test News Service] AI similarity calculation error:', error);
      throw error;
    }
  }

  // Copy the exact logic from NewsService.calculateSimpleSimilarity
  calculateSimpleSimilarity(topic1, topic2) {
    const words1 = new Set(topic1.toLowerCase().split(/\s+/));
    const words2 = new Set(topic2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Copy the exact logic from NewsService.calculateTopicSimilarity
  async calculateTopicSimilarity(topic1, topic2) {
    try {
      // Try AI similarity first
      const aiSimilarity = await this.calculateAISimilarity(topic1, topic2);
      console.log(`[Test] AI similarity: ${aiSimilarity}`);
      return aiSimilarity;
    } catch (error) {
      console.log(`[Test] AI similarity failed: ${error.message}`);
      
      // Fallback to simple similarity
      const simpleSimilarity = this.calculateSimpleSimilarity(topic1, topic2);
      console.log(`[Test] Simple similarity: ${simpleSimilarity}`);
      return simpleSimilarity;
    }
  }
}

async function testSimilarityIntegration() {
  console.log('🧪 Testing Complete Similarity Integration...\n');
  
  const testService = new TestNewsService();
  
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
    },
    {
      topic1: "Is increased military aid to Ukraine escalating the conflict?",
      topic2: "Is escalating military action in Ukraine justified?",
      expected: "Very similar Ukraine topics"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📝 Test Case ${i + 1}: ${testCase.expected}`);
    console.log(`   Topic 1: "${testCase.topic1}"`);
    console.log(`   Topic 2: "${testCase.topic2}"`);
    
    try {
      const similarity = await testService.calculateTopicSimilarity(testCase.topic1, testCase.topic2);
      console.log(`   ✅ Final similarity score: ${similarity}`);
      
      // Test the threshold logic (from NewsService)
      const SIMILARITY_THRESHOLD = 0.7;
      if (similarity >= SIMILARITY_THRESHOLD) {
        console.log(`   ⚠️  Topic too similar (${similarity}) - would be rejected`);
      } else {
        console.log(`   ✅ Topic sufficiently unique (${similarity}) - would be accepted`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🏁 Similarity Integration Test Complete');
}

// Run the test
testSimilarityIntegration().catch(console.error);
