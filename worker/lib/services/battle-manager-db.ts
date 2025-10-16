/**
 * Worker-Specific Battle Manager Database Service
 * Simplified version for the worker service without SSE broadcasting
 */

import { DatabaseService } from './database';
import { createDebateOracle } from './debate-oracle';

export interface BattleConfig {
  battleDurationHours: number;
  maxParticipants: number;
}

export class BattleManagerDB {
  private config: BattleConfig;
  private db: DatabaseService;
  private oracle: any; // DebateOracle instance
  private onChainDebateService: any; // OnChainDebateService instance

  constructor() {
    this.config = {
      battleDurationHours: parseFloat(process.env.BATTLE_DURATION_HOURS || '0.0083'), // 30 seconds
      maxParticipants: parseInt(process.env.BATTLE_MAX_PARTICIPANTS || '1000')
    };
    this.db = DatabaseService.getInstance();
    
    // Initialize oracle if contract is deployed
    try {
      this.oracle = createDebateOracle();
      console.log('🔗 Debate Oracle initialized');
    } catch (error) {
      console.log('⚠️  Debate Oracle not initialized (contract not deployed yet):', error.message);
      this.oracle = null;
    }

    // Initialize on-chain debate service
    try {
      const { createOnChainDebateService } = require('./onchain-debate-service');
      this.onChainDebateService = createOnChainDebateService();
      console.log('🔗 OnChainDebateService initialized');
    } catch (error) {
      console.log('⚠️  OnChainDebateService not initialized:', error.message);
      this.onChainDebateService = null;
    }
  }

  static async getInstance(): Promise<BattleManagerDB> {
    return new BattleManagerDB();
  }

  /**
   * Initialize the battle manager
   */
  async initialize(): Promise<void> {
    console.log(`Worker Battle Manager initialized with ${this.config.battleDurationHours}h intervals`);
    
    // Cleanup any expired battles first
    const cleanedCount = await this.db.cleanupExpiredBattles();
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired battles`);
    }

    // Check for duration configuration changes and complete current battle if needed
    await this.checkForDurationChange();
  }

  /**
   * Check and complete expired battles (for cron jobs)
   */
  async checkAndCompleteExpiredBattles(): Promise<void> {
    try {
      console.log('🕐 Checking for expired battles...');
      
      // Get all active battles that have expired
      const expiredBattles = await this.db.getExpiredBattles();
      
      if (expiredBattles.length === 0) {
        console.log('✅ No expired battles found');
      } else {
        console.log(`📊 Found ${expiredBattles.length} expired battle(s)`);
        
        for (const battle of expiredBattles) {
          console.log(`⏰ Completing expired battle: "${battle.title}" (${battle.id})`);
          
          // Complete the expired battle
          await this.handleBattleCompletion(battle.id);
        }
        
        console.log('✅ All expired battles processed');
      }
      
      // After handling expired battles, check if we need to create a new battle
      console.log('🕐 Checking if new battle needs to be created...');
      await this.checkAndCreateBattle();
      
    } catch (error) {
      console.error('❌ Error checking for expired battles:', error);
      throw error;
    }
  }

  /**
   * Check if current battle has expired and complete it if needed
   */
  private async checkAndCompleteExpiredBattle(): Promise<void> {
    try {
      const currentBattle = await this.db.getCurrentBattle();
      
      if (currentBattle && currentBattle.status === 'ACTIVE') {
        const now = new Date();
        if (now > currentBattle.endTime) {
          console.log(`⏰ Battle "${currentBattle.title}" has expired, completing it now`);
          
          // Complete the expired battle
          await this.handleBattleCompletion(currentBattle.id);
        }
      }
    } catch (error) {
      console.error('Error checking for expired battle:', error);
    }
  }

  /**
   * Check if we need to create a new battle
   */
  private async checkAndCreateBattle(): Promise<void> {
    try {
      const currentBattle = await this.db.getCurrentBattle();
      
      if (!currentBattle) {
        console.log('No active battle found, attempting to create new one...');
        try {
          await this.createNewBattle();
          console.log(`✅ Initial battle created successfully`);
        } catch (error) {
          console.log('❌ Could not create new battle, will retry on next API call:', error);
        }
      } else {
        // Check if current battle has expired
        const now = new Date();
        if (now > currentBattle.endTime && currentBattle.status === 'ACTIVE') {
          console.log(`Current battle "${currentBattle.title}" has expired, completing it and creating new one...`);
          
          // Complete the expired battle with AI-powered judging
          console.log(`🔄 Starting battle completion process for ${currentBattle.id}`);
          await this.completeBattleWithJudging(currentBattle.id);
          console.log(`✅ Battle completion process finished for ${currentBattle.id}`);
          
          // Create a new battle immediately after completion
          try {
            console.log(`🔄 Creating new battle after completing ${currentBattle.id}`);
            await this.createNewBattle();
            console.log(`✅ New battle created successfully`);
          } catch (error) {
            console.log('❌ Could not create new battle after completing expired one, will retry on next API call:', error);
          }
        } else {
          console.log(`Current battle: ${currentBattle.title} (${currentBattle.status}) - ends at ${currentBattle.endTime.toISOString()}`);
        }
      }
    } catch (error) {
      console.error('Error checking battle status:', error);
    }
  }

  /**
   * Check if the battle duration configuration has changed and complete current battle if needed
   */
  private async checkForDurationChange(): Promise<void> {
    try {
      const currentBattle = await this.db.getCurrentBattle();
      
      if (!currentBattle || currentBattle.status !== 'ACTIVE') {
        return; // No active battle to check
      }

      // Check if the stored duration differs from current configuration
      const storedDurationHours = currentBattle.durationHours;
      const currentConfigHours = this.config.battleDurationHours;
      
      // Allow for small differences due to floating point precision (within 0.01 hours = 36 seconds)
      const toleranceHours = 0.01;
      const durationDifference = Math.abs(storedDurationHours - currentConfigHours);
      
      if (durationDifference > toleranceHours) {
        console.log(`🔄 Battle duration configuration changed!`);
        console.log(`   Stored battle duration: ${storedDurationHours}h`);
        console.log(`   New configuration: ${currentConfigHours}h`);
        console.log(`   Completing current battle "${currentBattle.title}" and will create new one with correct duration...`);
        
        // Complete the current battle immediately
        await this.db.completeBattle(currentBattle.id, []);
        
        console.log(`✅ Battle "${currentBattle.title}" completed due to duration configuration change`);
      } else {
        console.log(`✅ Current battle duration matches configuration (${currentConfigHours}h)`);
      }
    } catch (error) {
      console.error('Error checking for duration changes:', error);
    }
  }

  /**
   * Create a new battle automatically
   */
  private async createNewBattle(): Promise<void> {
    try {
      console.log('Creating new automatic battle...');
      
      // Use the news service directly to get a real topic
      const NewsService = (await import('./news-service')).default;
      const topic = await NewsService.getDailyBattleTopic();
      
      if (!topic) {
        throw new Error('Failed to generate battle topic');
      }

      // Calculate battle timing AFTER AI generation completes
      const actualStartTime = new Date();
      const endTime = new Date(actualStartTime.getTime() + (this.config.battleDurationHours * 60 * 60 * 1000));

      let debateId: number | undefined;

      // Create on-chain debate if service is available
      if (this.onChainDebateService && this.onChainDebateService.isReady()) {
        try {
          console.log('🔗 Creating on-chain debate...');
          debateId = await this.onChainDebateService.createDebate(
            topic.title,
            "1", // 1 USDC entry fee
            this.config.maxParticipants,
            this.config.battleDurationHours
          );
          console.log(`✅ On-chain debate created with ID: ${debateId}`);
        } catch (error) {
          console.error('❌ Failed to create on-chain debate:', error);
          console.log('⚠️  Creating battle without on-chain integration');
        }
      } else {
        console.log('⚠️  OnChainDebateService not available, creating battle without on-chain integration');
      }

      const battle = await this.db.createBattle({
        title: topic.title,
        description: topic.description,
        category: topic.category,
        source: topic.source,
        sourceUrl: topic.articleUrl || topic.source,
        imageUrl: topic.imageUrl,
        thumbnail: topic.thumbnail,
        startTime: actualStartTime,
        endTime: endTime,
        durationHours: this.config.battleDurationHours,
        maxParticipants: this.config.maxParticipants,
        debatePoints: topic.debatePoints,
        overallScore: 0, // topic.qualityAnalysis?.overallScore,
        balanceScore: 0, // topic.qualityAnalysis?.balanceScore,
        complexity: 'medium', // topic.complexity,
        controversyLevel: 'medium', // topic.controversyLevel,
        debateId: debateId, // Link to on-chain debate
      });

      console.log(`New battle created: ${battle.id}`);
      console.log(`Battle topic: ${battle.title}`);
      console.log(`Battle ends at: ${battle.endTime}`);
      if (debateId) {
        console.log(`🔗 Linked to on-chain debate ID: ${debateId}`);
      }
      console.log(`Automatic battle generation scheduled every ${this.config.battleDurationHours} hours`);

    } catch (error) {
      console.error('❌ Failed to create new battle:', error.message);
      
      // If it's a rate limit error, log it but don't set cooldowns in worker
      if (error.message.includes('429') || 
          error.message.includes('rate limit') ||
          error.message.includes('Failed to generate battle topic after')) {
        console.log('🚫 Rate limit detected, will retry on next check');
      } else {
        console.log('🔄 Will retry battle generation on next interval');
      }
    }
  }

  /**
   * Handle complete battle flow: completion → judging → winner selection → new battle
   */
  private async handleBattleCompletion(battleId: string): Promise<void> {
    try {
      console.log(`🏁 Starting complete battle flow for battle ${battleId}`);
      
      // Step 1: Complete the battle with AI judging and winner selection
      const completionResult = await this.completeBattleWithJudging(battleId);
      
      // Step 2: Ensure winner selection is fully completed before proceeding
      if (completionResult.success) {
        console.log(`✅ Winner selection completed successfully for battle ${battleId}`);
        
        // Step 3: Wait a moment to ensure all database operations are committed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Create new battle after completion
        console.log(`🔄 Creating new battle after completing ${battleId}`);
        await this.createNewBattle();
        
        console.log(`✅ Complete battle flow finished for ${battleId}`);
      } else {
        console.log(`⚠️ Winner selection failed for battle ${battleId}, will retry on next API call`);
      }
    } catch (error: any) {
      console.error(`❌ Error in complete battle flow for ${battleId}:`, error);
    }
  }

  /**
   * Complete battle with AI-powered judging using optimized hybrid method
   */
  private async completeBattleWithJudging(battleId: string): Promise<{ success: boolean; winner?: any; error?: string }> {
    try {
      console.log(`🏆 Starting AI-powered battle completion for battle ${battleId}`);
      
      // Get battle data and casts
      const battle = await this.db.getBattleById(battleId);
      if (!battle) {
        console.log(`❌ Battle ${battleId} not found`);
        return { success: false, error: 'Battle not found' };
      }

      const casts = await this.db.getCastsForBattle(battleId);
      if (casts.length === 0) {
        console.log(`⚠️ No casts found for battle "${battle.title}" (${battleId})`);
        console.log(`📊 Battle had ${battle.participants?.length || 0} participants but 0 casts submitted`);
        console.log(`🏁 Completing battle without winners`);
        await this.db.completeBattle(battleId, []);
        return { success: true }; // Successfully completed, just no winner
      }

      console.log(`📊 Found ${casts.length} casts for battle ${battleId}`);

      // Use Agent Orchestrator for AI-powered judging
      const AgentOrchestrator = (await import('../agents/agent-orchestrator')).default;
      const orchestrator = new AgentOrchestrator(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      
      // Complete battle with optimized hybrid method
      const result = await orchestrator.completeBattle(battle, casts, 'hybrid');
      
      if (result && result.judgment && result.judgment.winner) {
        const winner = result.judgment.winner;
        const winners = [{
          userId: winner.userId,
          position: 1,
          prize: 'Winner of the battle'
        }];

        // Store insights if generated
        if ((result.judgment as any).insights) {
          try {
            await this.db.updateBattleInsights(battleId, (result.judgment as any).insights);
            console.log(`💡 Insights stored for battle ${battleId}`);
          } catch (error) {
            console.error(`❌ Failed to store insights for battle ${battleId}:`, error);
          }
        }

        // Complete battle with winners
        await this.db.completeBattle(battleId, winners);
        
        // Process on-chain payout if oracle is available
        if (this.oracle) {
          try {
            console.log(`🔗 Processing on-chain payout for battle ${battleId}`);
            await this.oracle.processBattleCompletion(battleId);
            console.log(`✅ On-chain payout processed successfully`);
          } catch (error) {
            console.error(`❌ Failed to process on-chain payout:`, error);
            // Don't fail the entire process if oracle fails
          }
        } else {
          console.log(`⚠️  Oracle not available, skipping on-chain payout`);
        }
        
        // Award 100 points to the winner
        try {
          const winnerUser = await this.db.getUserById(winner.userId);
          if (winnerUser) {
            const newPoints = await this.db.awardParticipationPoints(winnerUser.address, 100);
            console.log(`🎉 Winner ${winnerUser.address} awarded 100 points! Total points: ${newPoints}`);
          }
        } catch (error) {
          console.error(`❌ Failed to award winner points:`, error);
        }
        
        console.log(`✅ Battle ${battleId} completed successfully`);
        console.log(`🏆 Winner: ${winner.userId} (${winner.selectionMethod})`);
        console.log(`📈 Winning side: ${winner.groupAnalysis?.winningSide || 'Unknown'}`);
        console.log(`💡 Insights generated: ${(result.judgment as any).insights ? 'Yes' : 'No'}`);
        
        return { success: true, winner: winner };
      } else {
        console.log(`⚠️ AI judging failed for battle ${battleId}, completing without winners`);
        await this.db.completeBattle(battleId, []);
        return { success: true }; // Successfully completed, just no winner
      }

    } catch (error) {
      console.error(`❌ Error completing battle ${battleId} with AI judging:`, error);
      
      // Fallback: complete battle without winners
      try {
        await this.db.completeBattle(battleId, []);
        console.log(`⚠️ Battle ${battleId} completed without winners due to error`);
        return { success: true }; // Successfully completed, just no winner
      } catch (fallbackError) {
        console.error(`❌ Failed to complete battle ${battleId} even with fallback:`, fallbackError);
        return { success: false, error: fallbackError.message };
      }
    }
  }

  /**
   * Get the current active battle
   */
  async getCurrentBattle() {
    return await this.db.getCurrentBattle();
  }

  /**
   * Get battle history
   */
  async getBattleHistory(limit: number = 10) {
    return await this.db.getBattleHistory(limit);
  }

  /**
   * Manually trigger battle generation (for testing/admin purposes)
   */
  async triggerBattleGeneration(): Promise<void> {
    console.log('Manually triggering battle generation...');
    await this.checkAndCreateBattle();
  }

  /**
   * Get battle configuration
   */
  getConfig(): BattleConfig {
    return { ...this.config };
  }

  /**
   * Update battle configuration
   */
  updateConfig(updates: Partial<BattleConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get battle statistics
   */
  async getStats() {
    return await this.db.getBattleStats();
  }
}
