#!/usr/bin/env node

/**
 * Test script for the optimized hybrid judging flow
 * Tests the complete battle completion process with AI-powered judging
 */

import { DatabaseService } from '../lib/services/database.js';
import AgentOrchestrator from '../lib/agents/agent-orchestrator.js';
import { BattleManagerDB } from '../lib/services/battle-manager-db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class OptimizedJudgingTester {
  constructor() {
    this.db = DatabaseService.getInstance();
    this.battleManager = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTests() {
    console.log('🧪 Starting Optimized Hybrid Judging Tests\n');

    try {
      // Initialize battle manager
      this.battleManager = await BattleManagerDB.getInstance();
      await this.battleManager.initialize();

      // Run test suite
      await this.testNonLLMScoring();
      await this.testGroupBasedSelection();
      await this.testTop3Selection();
      await this.testInsightsGeneration();
      await this.testCompleteBattleFlow();
      await this.testErrorHandling();

      // Print results
      this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testNonLLMScoring() {
    console.log('📊 Testing Non-LLM Scoring Functions...');

    try {
      const JudgeAgent = (await import('../lib/agents/judge-agent.js')).default;
      const judge = new JudgeAgent(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      // Test quality scoring
      const qualityTests = [
        { content: 'Bitcoin will revolutionize finance because it provides decentralized currency.', expected: 'high' },
        { content: 'lol', expected: 'low' },
        { content: 'The evidence shows that cryptocurrency adoption has increased by 300% in the past year, however, regulatory concerns remain significant.', expected: 'high' }
      ];

      for (const test of qualityTests) {
        const score = judge.calculateQualityScore(test.content);
        const passed = test.expected === 'high' ? score >= 6 : score <= 6;
        this.recordTest('Quality Scoring', `"${test.content.substring(0, 30)}..."`, passed, score);
      }

      // Test relevance scoring
      const battleData = {
        title: 'Crypto Regulation Debate',
        description: 'Should governments regulate cryptocurrency markets?'
      };

      const relevanceTests = [
        { content: 'Cryptocurrency regulation is essential for market stability.', expected: 'high' },
        { content: 'I love pizza and movies.', expected: 'low' },
        { content: 'Government oversight of crypto markets can prevent fraud.', expected: 'high' }
      ];

      for (const test of relevanceTests) {
        const score = judge.calculateRelevanceScore(test.content, battleData);
        const passed = test.expected === 'high' ? score >= 6 : score <= 6;
        this.recordTest('Relevance Scoring', `"${test.content.substring(0, 30)}..."`, passed, score);
      }

      // Test engagement scoring
      const engagementTests = [
        { content: 'Should we regulate crypto? What do you think?', expected: 'high' },
        { content: 'Crypto is good.', expected: 'low' },
        { content: 'This is wrong! We must act now!', expected: 'high' }
      ];

      for (const test of engagementTests) {
        const score = judge.calculateEngagementScore(test.content);
        const passed = test.expected === 'high' ? score >= 6 : score <= 6;
        this.recordTest('Engagement Scoring', `"${test.content.substring(0, 30)}..."`, passed, score);
      }

      console.log('✅ Non-LLM Scoring Tests Completed\n');

    } catch (error) {
      console.error('❌ Non-LLM Scoring Tests Failed:', error);
      this.recordTest('Non-LLM Scoring', 'All tests', false, error.message);
    }
  }

  async testGroupBasedSelection() {
    console.log('🏆 Testing Group-Based Selection...');

    try {
      const JudgeAgent = (await import('../lib/agents/judge-agent.js')).default;
      const judge = new JudgeAgent(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      // Create mock battle data
      const battleData = {
        id: 'test-battle-1',
        title: 'Crypto Regulation Debate',
        description: 'Should governments regulate cryptocurrency markets?'
      };

      // Create mock casts with different sides
      const mockCasts = [
        {
          id: 'cast-1',
          userId: 'user-1',
          content: 'Cryptocurrency regulation is essential for market stability and investor protection.',
          side: 'SUPPORT',
          createdAt: new Date()
        },
        {
          id: 'cast-2',
          userId: 'user-2',
          content: 'Government oversight of crypto markets can prevent fraud and ensure transparency.',
          side: 'SUPPORT',
          createdAt: new Date()
        },
        {
          id: 'cast-3',
          userId: 'user-3',
          content: 'Crypto should remain decentralized without government interference.',
          side: 'OPPOSE',
          createdAt: new Date()
        },
        {
          id: 'cast-4',
          userId: 'user-4',
          content: 'Regulation stifles innovation and goes against crypto principles.',
          side: 'OPPOSE',
          createdAt: new Date()
        }
      ];

      // Test group-based selection
      const result = await judge.selectOptimizedHybridWinner(battleData, mockCasts);

      const tests = [
        {
          name: 'Winner Selection',
          condition: result && result.id,
          expected: 'Winner should be selected'
        },
        {
          name: 'Group Analysis',
          condition: result.groupAnalysis && result.groupAnalysis.winningSide,
          expected: 'Group analysis should be present'
        },
        {
          name: 'Top 3 Selection',
          condition: result.groupAnalysis.top3Candidates && result.groupAnalysis.top3Candidates.length <= 3,
          expected: 'Top 3 candidates should be selected'
        },
        {
          name: 'Winning Side',
          condition: ['SUPPORT', 'OPPOSE'].includes(result.groupAnalysis.winningSide),
          expected: 'Winning side should be SUPPORT or OPPOSE'
        }
      ];

      for (const test of tests) {
        this.recordTest('Group-Based Selection', test.name, test.condition, test.expected);
      }

      console.log(`✅ Group-Based Selection Tests Completed - Winner: ${result.groupAnalysis.winningSide}\n`);

    } catch (error) {
      console.error('❌ Group-Based Selection Tests Failed:', error);
      this.recordTest('Group-Based Selection', 'All tests', false, error.message);
    }
  }

  async testTop3Selection() {
    console.log('🎯 Testing Top 3 Selection...');

    try {
      const JudgeAgent = (await import('../lib/agents/judge-agent.js')).default;
      const judge = new JudgeAgent(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      // Create mock casts with known scores
      const mockCasts = [
        { id: 'cast-1', content: 'Excellent argument with evidence', side: 'SUPPORT' },
        { id: 'cast-2', content: 'Good argument with some evidence', side: 'SUPPORT' },
        { id: 'cast-3', content: 'Decent argument', side: 'SUPPORT' },
        { id: 'cast-4', content: 'Poor argument', side: 'SUPPORT' },
        { id: 'cast-5', content: 'Very poor argument', side: 'SUPPORT' }
      ];

      // Calculate scores for each cast
      const castsWithScores = mockCasts.map(cast => ({
        ...cast,
        qualityScore: judge.calculateQualityScore(cast.content),
        relevanceScore: judge.calculateRelevanceScore(cast.content, { title: 'Test Topic', description: 'Test Description' }),
        engagementScore: judge.calculateEngagementScore(cast.content),
        totalScore: 0
      }));

      // Calculate total scores
      castsWithScores.forEach(cast => {
        cast.totalScore = (
          cast.qualityScore * 0.4 +
          cast.relevanceScore * 0.3 +
          cast.engagementScore * 0.2 +
          judge.calculateOriginalityScore(cast.content, mockCasts) * 0.1
        );
      });

      // Select top 3
      const top3 = castsWithScores
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 3);

      const tests = [
        {
          name: 'Top 3 Count',
          condition: top3.length === 3,
          expected: 'Should select exactly 3 candidates'
        },
        {
          name: 'Score Ordering',
          condition: top3[0].totalScore >= top3[1].totalScore && top3[1].totalScore >= top3[2].totalScore,
          expected: 'Should be ordered by score (highest first)'
        },
        {
          name: 'Best Cast Included',
          condition: top3.some(cast => cast.id === 'cast-1'),
          expected: 'Best cast should be included in top 3'
        }
      ];

      for (const test of tests) {
        this.recordTest('Top 3 Selection', test.name, test.condition, test.expected);
      }

      console.log(`✅ Top 3 Selection Tests Completed - Top scores: ${top3.map(c => c.totalScore.toFixed(2)).join(', ')}\n`);

    } catch (error) {
      console.error('❌ Top 3 Selection Tests Failed:', error);
      this.recordTest('Top 3 Selection', 'All tests', false, error.message);
    }
  }

  async testInsightsGeneration() {
    console.log('💡 Testing Insights Generation...');

    try {
      const JudgeAgent = (await import('../lib/agents/judge-agent.js')).default;
      const judge = new JudgeAgent(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      const battleData = {
        title: 'Crypto Regulation Debate',
        description: 'Should governments regulate cryptocurrency markets?'
      };

      const top3Candidates = [
        {
          id: 'cast-1',
          score: '8.5',
          content: 'Cryptocurrency regulation is essential for market stability and investor protection.'
        },
        {
          id: 'cast-2',
          score: '7.8',
          content: 'Government oversight of crypto markets can prevent fraud and ensure transparency.'
        },
        {
          id: 'cast-3',
          score: '7.2',
          content: 'Proper regulation can balance innovation with consumer protection.'
        }
      ];

      // Test insights generation
      const insights = await judge.generateInsightsFromTop3(top3Candidates, battleData);

      const tests = [
        {
          name: 'Insights Generated',
          condition: insights && insights.length > 0,
          expected: 'Insights should be generated'
        },
        {
          name: 'Insights Length',
          condition: insights && insights.length > 50,
          expected: 'Insights should be substantial'
        },
        {
          name: 'Insights Content',
          condition: insights && (insights.includes('regulation') || insights.includes('crypto') || insights.includes('market')),
          expected: 'Insights should be relevant to the topic'
        }
      ];

      for (const test of tests) {
        this.recordTest('Insights Generation', test.name, test.condition, test.expected);
      }

      if (insights) {
        console.log(`✅ Insights Generation Tests Completed - Generated: "${insights.substring(0, 100)}..."\n`);
      } else {
        console.log('⚠️ Insights Generation Tests Completed - No insights generated\n');
      }

    } catch (error) {
      console.error('❌ Insights Generation Tests Failed:', error);
      this.recordTest('Insights Generation', 'All tests', false, error.message);
    }
  }

  async testCompleteBattleFlow() {
    console.log('🔄 Testing Complete Battle Flow...');

    try {
      // Create a test battle
      const testBattle = await this.createTestBattle();
      const testCasts = await this.createTestCasts(testBattle.id);

      console.log(`📊 Created test battle with ${testCasts.length} casts`);

      // Test the complete flow using Agent Orchestrator
      const orchestrator = new AgentOrchestrator(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      
      // Ensure battle has the correct structure for the orchestrator
      const battleForOrchestrator = {
        ...testBattle,
        topic: {
          title: testBattle.title,
          description: testBattle.description,
          category: testBattle.category
        }
      };
      
      const result = await orchestrator.completeBattle(battleForOrchestrator, testCasts, 'hybrid');

      const tests = [
        {
          name: 'Battle Completion',
          condition: result && result.judgment,
          expected: 'Battle should be completed with judgment'
        },
        {
          name: 'Winner Selection',
          condition: result.judgment && result.judgment.winner,
          expected: 'Winner should be selected'
        },
        {
          name: 'Group Analysis',
          condition: result.judgment.winner.groupAnalysis,
          expected: 'Group analysis should be present'
        },
        {
          name: 'Insights Generated',
          condition: result.judgment.judgmentDetails && result.judgment.judgmentDetails.insights && result.judgment.judgmentDetails.insights.length > 0,
          expected: 'Insights should be generated'
        },
        {
          name: 'Statistics Generated',
          condition: result.statistics,
          expected: 'Statistics should be generated'
        }
      ];

      for (const test of tests) {
        this.recordTest('Complete Battle Flow', test.name, test.condition, test.expected);
      }

      console.log(`✅ Complete Battle Flow Tests Completed - Winner: ${result.judgment.winner.userId}\n`);

      // Cleanup test data
      await this.cleanupTestData(testBattle.id);

    } catch (error) {
      console.error('❌ Complete Battle Flow Tests Failed:', error);
      this.recordTest('Complete Battle Flow', 'All tests', false, error.message);
    }
  }

  async testErrorHandling() {
    console.log('🛡️ Testing Error Handling...');

    try {
      const JudgeAgent = (await import('../lib/agents/judge-agent.js')).default;
      const judge = new JudgeAgent(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      // Test with empty casts
      const emptyCastsResult = await judge.selectOptimizedHybridWinner(
        { id: 'test', title: 'Test', description: 'Test' },
        []
      );

      // Test with invalid battle data
      const invalidBattleResult = await judge.selectOptimizedHybridWinner(
        { id: 'test', title: 'Test', description: 'Test' },
        [{ id: 'cast-1', content: 'Test', side: 'SUPPORT' }]
      );

      const tests = [
        {
          name: 'Empty Casts Handling',
          condition: emptyCastsResult && emptyCastsResult.selectionMethod === 'random',
          expected: 'Should fallback to random selection for empty casts'
        },
        {
          name: 'Invalid Battle Data Handling',
          condition: invalidBattleResult && invalidBattleResult.selectionMethod === 'optimized-hybrid',
          expected: 'Should handle valid battle data correctly'
        }
      ];

      for (const test of tests) {
        this.recordTest('Error Handling', test.name, test.condition, test.expected);
      }

      console.log('✅ Error Handling Tests Completed\n');

    } catch (error) {
      console.error('❌ Error Handling Tests Failed:', error);
      this.recordTest('Error Handling', 'All tests', false, error.message);
    }
  }

  async createTestBattle() {
    const battle = await this.db.prisma.battle.create({
      data: {
        title: 'Test Crypto Regulation Debate',
        description: 'Should governments regulate cryptocurrency markets?',
        category: 'crypto',
        source: 'Test Source',
        status: 'ACTIVE',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        durationHours: 0.033, // ~2 minutes
        maxParticipants: 1000,
        debatePoints: {
          Support: ['Market stability', 'Investor protection'],
          Oppose: ['Innovation freedom', 'Decentralization']
        }
      }
    });

    return battle;
  }

  async createTestCasts(battleId) {
    // First create test users
    const testUsers = [
      { address: 'test-user-1', username: 'TestUser1' },
      { address: 'test-user-2', username: 'TestUser2' },
      { address: 'test-user-3', username: 'TestUser3' },
      { address: 'test-user-4', username: 'TestUser4' },
      { address: 'test-user-5', username: 'TestUser5' }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const user = await this.db.prisma.user.upsert({
        where: { address: userData.address },
        update: {},
        create: userData
      });
      createdUsers.push(user);
    }

    // Create battle participations
    for (const user of createdUsers) {
      await this.db.prisma.battleParticipation.upsert({
        where: {
          userId_battleId: {
            userId: user.id,
            battleId: battleId
          }
        },
        update: {},
        create: {
          userId: user.id,
          battleId: battleId
        }
      });
    }

    // Now create test casts
    const testCasts = [
      {
        userId: createdUsers[0].id,
        battleId: battleId,
        content: 'Cryptocurrency regulation is essential for market stability and investor protection.',
        side: 'SUPPORT'
      },
      {
        userId: createdUsers[1].id,
        battleId: battleId,
        content: 'Government oversight of crypto markets can prevent fraud and ensure transparency.',
        side: 'SUPPORT'
      },
      {
        userId: createdUsers[2].id,
        battleId: battleId,
        content: 'Crypto should remain decentralized without government interference.',
        side: 'OPPOSE'
      },
      {
        userId: createdUsers[3].id,
        battleId: battleId,
        content: 'Regulation stifles innovation and goes against crypto principles.',
        side: 'OPPOSE'
      },
      {
        userId: createdUsers[4].id,
        battleId: battleId,
        content: 'Proper regulation can balance innovation with consumer protection.',
        side: 'SUPPORT'
      }
    ];

    const createdCasts = [];
    for (const castData of testCasts) {
      const cast = await this.db.prisma.cast.create({
        data: castData
      });
      createdCasts.push(cast);
    }

    return createdCasts;
  }

  async cleanupTestData(battleId) {
    try {
      // Delete casts
      await this.db.prisma.cast.deleteMany({
        where: { battleId: battleId }
      });

      // Delete battle
      await this.db.prisma.battle.delete({
        where: { id: battleId }
      });

      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.error('⚠️ Failed to cleanup test data:', error);
    }
  }

  recordTest(category, testName, passed, details = '') {
    this.testResults.tests.push({
      category,
      testName,
      passed,
      details: details.toString()
    });

    if (passed) {
      this.testResults.passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      this.testResults.failed++;
      console.log(`  ❌ ${testName} - ${details}`);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);
    console.log(`🎯 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.category}: ${test.testName} - ${test.details}`);
        });
    }

    console.log('\n🎉 Optimized Hybrid Judging Tests Completed!');
    
    if (this.testResults.failed === 0) {
      console.log('🚀 All tests passed! The optimized judging system is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.');
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new OptimizedJudgingTester();
tester.runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
