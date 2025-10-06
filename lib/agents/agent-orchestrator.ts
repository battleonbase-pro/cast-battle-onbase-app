// lib/agents/agent-orchestrator.js
import NewsCuratorAgent from './news-curator-agent';
import DebateGeneratorAgent from './debate-generator-agent';
import ModeratorAgent from './moderator-agent';
import JudgeAgent from './judge-agent';

class AgentOrchestrator {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // Initialize agents
    this.newsCurator = new NewsCuratorAgent(this.apiKey);
    this.debateGenerator = new DebateGeneratorAgent(this.apiKey);
    this.moderator = new ModeratorAgent(this.apiKey);
    this.judge = new JudgeAgent(this.apiKey);
    
    this.workflowHistory = [];
  }

  // Main workflow: Generate daily battle topic
  async generateDailyBattleTopic() {
    const workflowId = `workflow_${Date.now()}`;
    this.logWorkflow('Starting daily battle topic generation', workflowId);

    try {
      // Step 1: News Curator finds trending topic
      this.logWorkflow('Step 1: News curation', workflowId);
      const curatedTopic = await this.newsCurator.findDailyBattleTopic();
      
      if (!curatedTopic) {
        throw new Error('News curator failed to find suitable topic');
      }

      // Step 2: Debate Generator creates debate topic
      this.logWorkflow('Step 2: Debate generation', workflowId);
      const debateTopic = await this.debateGenerator.generateDebateTopic(curatedTopic);
      
      if (!debateTopic) {
        throw new Error('Debate generator failed to create debate topic');
      }

      // Step 3: Quality analysis (optional)
      this.logWorkflow('Step 3: Quality analysis', workflowId);
      const qualityAnalysis = await this.debateGenerator.analyzeDebateQuality(debateTopic);

      const result = {
        workflowId,
        curatedTopic,
        debateTopic,
        qualityAnalysis,
        generatedAt: new Date().toISOString(),
        agents: {
          newsCurator: this.newsCurator.name,
          debateGenerator: this.debateGenerator.name
        }
      };

      this.logWorkflow('Successfully generated daily battle topic', workflowId, {
        title: debateTopic.title,
        qualityScore: qualityAnalysis.overallScore
      });

      this.workflowHistory.push({
        id: workflowId,
        type: 'daily_battle_generation',
        status: 'completed',
        timestamp: new Date().toISOString(),
        result: result
      });

      return result;

    } catch (error) {
      this.logWorkflow('Error in daily battle topic generation', workflowId, { error: error.message });
      
      this.workflowHistory.push({
        id: workflowId,
        type: 'daily_battle_generation',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      });

      throw error;
    }
  }

  // Workflow: Moderate individual cast
  async moderateCast(castContent, battleTopic) {
    const workflowId = `moderation_${Date.now()}`;
    this.logWorkflow('Starting cast moderation', workflowId);

    try {
      const moderation = await this.moderator.moderateCast(castContent, battleTopic);
      
      this.logWorkflow('Successfully moderated cast', workflowId, {
        isAppropriate: moderation.isAppropriate,
        qualityScore: moderation.qualityScore
      });

      return moderation;

    } catch (error) {
      this.logWorkflow('Error in cast moderation', workflowId, { error: error.message });
      throw error;
    }
  }

  // Workflow: Complete battle and determine winner
  async completeBattle(battleData, casts, winnerMethod = 'hybrid') {
    const workflowId = `battle_completion_${Date.now()}`;
    this.logWorkflow('Starting battle completion', workflowId);

    try {
      // Step 1: Batch moderate all casts
      this.logWorkflow('Step 1: Batch cast moderation', workflowId);
      const moderationResults = await this.moderator.moderateBattleCasts(casts, battleData);
      
      if (moderationResults.results.length === 0) {
        throw new Error('No casts found for moderation');
      }

      // Step 2: Judge determines winner
      this.logWorkflow('Step 2: Battle judgment', workflowId);
      const judgment = await this.judge.judgeBattle(
        battleData, 
        casts, 
        moderationResults.results, 
        winnerMethod
      );

      // Step 3: Generate battle statistics
      this.logWorkflow('Step 3: Statistics generation', workflowId);
      const statistics = await this.judge.generateBattleStatistics(
        battleData, 
        casts, 
        moderationResults.results, 
        judgment
      );

      const result = {
        workflowId,
        battleData,
        moderationResults,
        judgment,
        statistics,
        completedAt: new Date().toISOString(),
        agents: {
          moderator: this.moderator.name,
          judge: this.judge.name
        }
      };

      this.logWorkflow('Successfully completed battle', workflowId, {
        winnerId: judgment.winner.id,
        winnerMethod: judgment.winnerMethod,
        totalCasts: casts.length
      });

      this.workflowHistory.push({
        id: workflowId,
        type: 'battle_completion',
        status: 'completed',
        timestamp: new Date().toISOString(),
        result: result
      });

      return result;

    } catch (error) {
      this.logWorkflow('Error in battle completion', workflowId, { error: error.message });
      
      this.workflowHistory.push({
        id: workflowId,
        type: 'battle_completion',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      });

      throw error;
    }
  }

  // Workflow: Generate debate variations
  async generateDebateVariations(originalTopic, count = 2) {
    const workflowId = `variations_${Date.now()}`;
    this.logWorkflow('Starting debate variation generation', workflowId);

    try {
      const variations = await this.debateGenerator.generateDebateVariations(originalTopic, count);
      
      this.logWorkflow('Successfully generated debate variations', workflowId, {
        requested: count,
        generated: variations.length
      });

      return {
        workflowId,
        originalTopic,
        variations,
        generatedAt: new Date().toISOString(),
        agent: this.debateGenerator.name
      };

    } catch (error) {
      this.logWorkflow('Error in debate variation generation', workflowId, { error: error.message });
      throw error;
    }
  }

  // Workflow: Analyze moderation patterns
  async analyzeModerationPatterns(moderationHistory) {
    const workflowId = `pattern_analysis_${Date.now()}`;
    this.logWorkflow('Starting moderation pattern analysis', workflowId);

    try {
      const analysis = await this.moderator.analyzeModerationPatterns(moderationHistory);
      
      this.logWorkflow('Successfully analyzed moderation patterns', workflowId, {
        historyLength: moderationHistory.length,
        insightCount: analysis.insights.length
      });

      return {
        workflowId,
        analysis,
        analyzedAt: new Date().toISOString(),
        agent: this.moderator.name
      };

    } catch (error) {
      this.logWorkflow('Error in moderation pattern analysis', workflowId, { error: error.message });
      throw error;
    }
  }

  // Get agent status and health
  async getAgentStatus() {
    const status = {
      newsCurator: {
        name: this.newsCurator.name,
        role: this.newsCurator.role,
        status: 'active'
      },
      debateGenerator: {
        name: this.debateGenerator.name,
        role: this.debateGenerator.role,
        status: 'active'
      },
      moderator: {
        name: this.moderator.name,
        role: this.moderator.role,
        status: 'active'
      },
      judge: {
        name: this.judge.name,
        role: this.judge.role,
        status: 'active'
      },
      orchestrator: {
        name: 'Agent Orchestrator',
        role: 'Workflow Coordination',
        status: 'active',
        workflowCount: this.workflowHistory.length
      }
    };

    return status;
  }

  // Get workflow history
  getWorkflowHistory(limit = 10) {
    return this.workflowHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get workflow statistics
  getWorkflowStatistics() {
    const total = this.workflowHistory.length;
    const completed = this.workflowHistory.filter(w => w.status === 'completed').length;
    const failed = this.workflowHistory.filter(w => w.status === 'failed').length;
    
    const typeStats = {};
    this.workflowHistory.forEach(workflow => {
      typeStats[workflow.type] = (typeStats[workflow.type] || 0) + 1;
    });

    return {
      totalWorkflows: total,
      completedWorkflows: completed,
      failedWorkflows: failed,
      successRate: total > 0 ? (completed / total * 100).toFixed(2) : 0,
      typeDistribution: typeStats,
      lastWorkflow: this.workflowHistory[this.workflowHistory.length - 1]?.timestamp
    };
  }

  // Log workflow activity
  logWorkflow(message, workflowId, details = {}) {
    console.log(`[Agent Orchestrator] ${message}:`, {
      workflowId,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Test all agents
  async testAllAgents() {
    this.logWorkflow('Testing all agents');

    const results = {
      newsCurator: { status: 'pending' },
      debateGenerator: { status: 'pending' },
      moderator: { status: 'pending' },
      judge: { status: 'pending' }
    };

    try {
      // Test News Curator
      const curatedTopic = await this.newsCurator.findDailyBattleTopic();
      results.newsCurator = {
        status: 'success',
        testResult: curatedTopic ? 'Topic found' : 'No topic found'
      };
    } catch (error) {
      results.newsCurator = {
        status: 'failed',
        error: error.message
      };
    }

    try {
      // Test Debate Generator with mock data
      const mockTopic = {
        title: 'Test Article',
        description: 'Test description',
        source: 'Test Source',
        category: 'test'
      };
      const debateTopic = await this.debateGenerator.generateDebateTopic(mockTopic);
      results.debateGenerator = {
        status: 'success',
        testResult: debateTopic ? 'Debate generated' : 'No debate generated'
      };
    } catch (error) {
      results.debateGenerator = {
        status: 'failed',
        error: error.message
      };
    }

    try {
      // Test Moderator with mock data
      const mockCast = 'This is a test cast for moderation.';
      const mockBattleTopic = {
        title: 'Test Battle Topic',
        description: 'Test battle description',
        category: 'test'
      };
      const moderation = await this.moderator.moderateCast(mockCast, mockBattleTopic);
      results.moderator = {
        status: 'success',
        testResult: moderation ? 'Cast moderated' : 'No moderation result'
      };
    } catch (error) {
      results.moderator = {
        status: 'failed',
        error: error.message
      };
    }

    try {
      // Test Judge with mock data
      const mockBattleData = { 
        id: 'test', 
        title: 'Test Battle Topic',
        description: 'Test battle description',
        category: 'test'
      };
      const mockCasts = [
        { 
          id: 'cast1', 
          content: 'This is a test cast for the SUPPORT side', 
          userId: 'user1',
          side: 'SUPPORT'
        },
        { 
          id: 'cast2', 
          content: 'This is a test cast for the OPPOSE side', 
          userId: 'user2',
          side: 'OPPOSE'
        }
      ];
      const mockModerationResults = [
        { castId: 'cast1', isAppropriate: true, qualityScore: 8 },
        { castId: 'cast2', isAppropriate: true, qualityScore: 7 }
      ];
      const judgment = await this.judge.judgeBattle(mockBattleData, mockCasts, mockModerationResults);
      results.judge = {
        status: 'success',
        testResult: judgment ? 'Battle judged' : 'No judgment result'
      };
    } catch (error) {
      results.judge = {
        status: 'failed',
        error: error.message
      };
    }

    const allSuccessful = Object.values(results).every(r => r.status === 'success');
    
    this.logWorkflow('Agent testing completed', null, {
      allSuccessful,
      results
    });

    return {
      allSuccessful,
      results,
      testedAt: new Date().toISOString()
    };
  }

  // Generate daily battle topic with variation strategy
  async generateDailyBattleTopicWithVariation(strategy: 'different_category' | 'broad_topic') {
    const workflowId = `workflow_${Date.now()}`;
    this.logWorkflow(`Starting daily battle topic generation with ${strategy} strategy`, workflowId);

    try {
      // Step 1: News Curator finds trending topic with variation
      this.logWorkflow('Step 1: News curation with variation', workflowId);
      const curatedTopic = await this.newsCurator.findDailyBattleTopicWithVariation(strategy);
      
      if (!curatedTopic) {
        throw new Error('News curator failed to find suitable topic with variation');
      }

      // Step 2: Debate Generator creates debate topic
      this.logWorkflow('Step 2: Debate generation', workflowId);
      const debateTopic = await this.debateGenerator.generateDebateTopic(curatedTopic);
      
      if (!debateTopic) {
        throw new Error('Debate generator failed to create topic');
      }

      // Step 3: Quality analysis
      this.logWorkflow('Step 3: Quality analysis', workflowId);
      const qualityAnalysis = await this.debateGenerator.analyzeDebateQuality(debateTopic);
      
      if (!qualityAnalysis) {
        throw new Error('Quality analysis failed');
      }

      const result = {
        workflowId,
        debateTopic,
        curatedTopic,
        qualityAnalysis,
        generatedAt: new Date().toISOString(),
        strategy,
        agents: {
          newsCurator: this.newsCurator.name,
          debateGenerator: this.debateGenerator.name
        }
      };

      this.logWorkflow(`Successfully generated daily battle topic with ${strategy} strategy`, workflowId, {
        title: debateTopic.title,
        qualityScore: qualityAnalysis.overallScore
      });

      this.workflowHistory.push({
        id: workflowId,
        type: 'daily_battle_generation_variation',
        status: 'completed',
        timestamp: new Date().toISOString(),
        result: result
      });

      return result;

    } catch (error) {
      this.logWorkflow(`Error in daily battle topic generation with ${strategy} strategy`, workflowId, { error: error.message });
      
      this.workflowHistory.push({
        id: workflowId,
        type: 'daily_battle_generation_variation',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      });

      throw error;
    }
  }

  // Generate text using any of the agents (they all inherit from BaseAgent)
  async generateText(prompt: string, temperature = 0.7): Promise<string> {
    const result = await this.debateGenerator.generateTextContent(prompt, temperature);
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(`AI generation failed: ${result.error}`);
    }
  }
}

export default AgentOrchestrator;
