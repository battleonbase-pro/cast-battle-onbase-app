/**
 * Database-Powered Battle Manager Service
 * Handles automatic battle generation and management with persistent storage
 */

import NewsService from './news-service';
import { DatabaseService } from './database';
import { battleEventEmitter } from '@/app/api/battle/state-stream/route';
import { DBSharedStateManager } from './db-shared-state';

export interface BattleConfig {
  battleDurationHours: number;
  maxParticipants: number;
  enabled: boolean;
}

// Global singleton to ensure only one instance across all imports and hot reloads
declare global {
  var __battleManagerInstance: BattleManagerDB | undefined;
  var __battleManagerInitialized: boolean | undefined;
}

// Ensure global variables are initialized
if (typeof global.__battleManagerInstance === 'undefined') {
  global.__battleManagerInstance = undefined;
}
if (typeof global.__battleManagerInitialized === 'undefined') {
  global.__battleManagerInitialized = false;
}

export class BattleManagerDB {
  private config: BattleConfig;
  private db: DatabaseService;
  private sharedState: DBSharedStateManager;
  private isGeneratingBattle: boolean = false;

  constructor() {
    this.config = {
      battleDurationHours: parseFloat(process.env.BATTLE_DURATION_HOURS || '0.05'), // 3 minutes
      maxParticipants: parseInt(process.env.BATTLE_MAX_PARTICIPANTS || '1000'),
      enabled: process.env.BATTLE_GENERATION_ENABLED === 'true'
    };
    this.db = DatabaseService.getInstance();
    this.sharedState = DBSharedStateManager.getInstance();
  }

  static async getInstance(): Promise<BattleManagerDB> {
    if (!global.__battleManagerInstance) {
      global.__battleManagerInstance = new BattleManagerDB();
    }
    
    // Auto-initialize on first access
    if (!global.__battleManagerInitialized) {
      await global.__battleManagerInstance.initialize();
      global.__battleManagerInitialized = true;
    }
    
    return global.__battleManagerInstance;
  }

  /**
   * Initialize the battle manager
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Automatic battle generation is disabled');
      return;
    }

    console.log(`Battle Manager initialized with ${this.config.battleDurationHours}h intervals`);
    
    // Cleanup any expired battles first
    const cleanedCount = await this.db.cleanupExpiredBattles();
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired battles`);
    }

    // Check for duration configuration changes and complete current battle if needed
    await this.checkForDurationChange();
    
    // Check if we need to create a new battle
    await this.checkAndCreateBattle();
    
    // Set up automatic generation
    this.setupAutomaticGeneration();
  }

  /**
   * Ensure a battle exists (called by API endpoints)
   * This is the main entry point for server-side battle management
   */
  async ensureBattleExists(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Automatic battle generation is disabled');
      return;
    }

    // Cleanup expired battles first
    await this.db.cleanupExpiredBattles();
    
    // Check for duration configuration changes and complete current battle if needed
    await this.checkForDurationChange();
    
    // Check if we need to create a new battle
    await this.checkAndCreateBattle();
  }

  /**
   * Check if we need to create a new battle
   */
  private async checkAndCreateBattle(): Promise<void> {
    // Prevent multiple simultaneous battle generation
    if (this.isGeneratingBattle) {
      console.log('🔄 Battle generation already in progress, skipping...');
      return;
    }

    try {
      this.isGeneratingBattle = true;
      
      const currentBattle = await this.db.getCurrentBattle();
      
      if (!currentBattle) {
        console.log('No active battle found, attempting to create new one...');
        try {
          await this.createNewBattle();
        } catch {
          console.log('❌ Could not create new battle, will retry later');
        }
      } else {
        // Check if current battle has expired
        const now = new Date();
        if (now > currentBattle.endTime && currentBattle.status === 'ACTIVE') {
          console.log(`Current battle "${currentBattle.title}" has expired, completing it and creating new one...`);
          
          // Emit SSE event for battle ending
          battleEventEmitter.emit('battleEnded', {
            battleId: currentBattle.id,
            title: currentBattle.title
          });
          
          // Complete the expired battle with AI-powered judging
          await this.completeBattleWithJudging(currentBattle.id);
          
          // Create a new battle immediately
          try {
            await this.createNewBattle();
          } catch {
            console.log('❌ Could not create new battle after completing expired one, will retry later');
          }
        } else {
          console.log(`Current battle: ${currentBattle.title} (${currentBattle.status}) - ends at ${currentBattle.endTime.toISOString()}`);
        }
      }
    } catch (error) {
      console.error('Error checking battle status:', error);
    } finally {
      this.isGeneratingBattle = false;
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
        
        // Emit SSE event for battle ending due to duration change
        battleEventEmitter.emit('battleEnded', {
          battleId: currentBattle.id,
          title: currentBattle.title,
          reason: 'duration_change'
        });
        
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
      
      // Check if we're in rate limit cooldown using database shared state
      const now = new Date();
      const stateInfo = await this.sharedState.getStateInfo();
      
      console.log('🔍 Cooldown check (database shared state):');
      console.log('  - Current time:', now.toISOString());
      console.log('  - Current cooldown:', stateInfo.cooldown ? stateInfo.cooldown.toISOString() : 'null');
      console.log('  - Is cooldown active:', stateInfo.isActive);
      
      if (stateInfo.isActive) {
        console.log(`🚫 Still in rate limit cooldown, skipping battle creation. ${stateInfo.remainingMinutes} minutes remaining.`);
        return;
      } else if (stateInfo.cooldown && now >= stateInfo.cooldown) {
        // Cooldown has expired, clear it
        await this.sharedState.setRateLimitCooldown(null);
        console.log('✅ Rate limit cooldown expired, resuming battle creation');
      }
      
      // Use the news service directly to get a real topic
      const topic = await NewsService.getDailyBattleTopic();
      
      if (!topic) {
        throw new Error('Failed to generate battle topic');
      }

      // Calculate battle timing AFTER AI generation completes
      const actualStartTime = new Date();
      const endTime = new Date(actualStartTime.getTime() + (this.config.battleDurationHours * 60 * 60 * 1000));

      const battle = await this.db.createBattle({
        title: topic.title,
        description: topic.description,
        category: topic.category,
        source: topic.source,
        sourceUrl: topic.articleUrl || topic.sourceUrl,
        startTime: actualStartTime,
        endTime: endTime,
        durationHours: this.config.battleDurationHours,
        maxParticipants: this.config.maxParticipants,
        debatePoints: topic.debatePoints,
        overallScore: topic.qualityAnalysis?.overallScore,
        balanceScore: topic.qualityAnalysis?.balanceScore,
        complexity: topic.complexity,
        controversyLevel: topic.controversyLevel,
      });

      console.log(`New battle created: ${battle.id}`);
      console.log(`Battle topic: ${battle.title}`);
      console.log(`Battle ends at: ${battle.endTime}`);
      console.log(`Automatic battle generation scheduled every ${this.config.battleDurationHours} hours`);

      // Emit SSE event for new battle
      battleEventEmitter.emit('battleStarted', {
        battleId: battle.id,
        title: battle.title,
        description: battle.description,
        category: battle.category,
        source: battle.source,
        sourceUrl: battle.sourceUrl,
        endTime: battle.endTime
      });

    } catch (error) {
      console.error('❌ Failed to create new battle:', error.message);
      
      // If it's a rate limit error, set a cooldown period
      if (error.message.includes('429') || 
          error.message.includes('rate limit') ||
          error.message.includes('Failed to generate battle topic after')) {
        // Only set cooldown if not already in cooldown or if current cooldown has expired
        const now = new Date();
        const stateInfo = await this.sharedState.getStateInfo();
        
        console.log('🔍 Rate limit error detected (database shared state):');
        console.log('  - Current time:', now.toISOString());
        console.log('  - Current cooldown:', stateInfo.cooldown ? stateInfo.cooldown.toISOString() : 'null');
        console.log('  - Is cooldown active:', stateInfo.isActive);
        
        if (!stateInfo.cooldown || now >= stateInfo.cooldown) {
          const newCooldown = new Date(now.getTime() + 1 * 60 * 1000);
          await this.sharedState.setRateLimitCooldown(newCooldown);
          console.log('🚫 Rate limit detected, setting 1-minute cooldown period');
          console.log('⏰ Next battle generation attempt will be at:', newCooldown.toISOString());
        } else {
          console.log('🚫 Rate limit detected, but already in cooldown period');
          console.log('🔍 Current cooldown expires at:', stateInfo.cooldown.toISOString());
        }
      } else {
        console.log('🔄 Will retry battle generation on next interval');
      }
      // Don't create a battle if topic generation fails
      // The system will retry on the next interval
    }
  }

  /**
   * Set up automatic battle generation
   */
  private setupAutomaticGeneration(): void {
    if (!this.config.enabled) {
      console.log('⚠️ Automatic battle generation is disabled');
      return;
    }

    const intervalMs = this.config.battleDurationHours * 60 * 60 * 1000;
    console.log(`🕐 Setting up automatic battle generation every ${this.config.battleDurationHours} hours (${intervalMs}ms)`);
    
    // Set up the main interval for battle generation
    setInterval(async () => {
      console.log('⏰ Main battle generation interval triggered');
      try {
        await this.checkAndCreateBattle();
      } catch (error) {
        console.error('Error in automatic battle generation:', error);
        // Don't retry immediately - wait for next interval
      }
    }, intervalMs);

    console.log(`Automatic battle generation scheduled every ${this.config.battleDurationHours} hours`);
  }

  /**
   * Complete battle with AI-powered judging using optimized hybrid method
   */
  private async completeBattleWithJudging(battleId: string): Promise<void> {
    try {
      console.log(`🏆 Starting AI-powered battle completion for battle ${battleId}`);
      
      // Get battle data and casts
      const battle = await this.db.getBattleById(battleId);
      if (!battle) {
        console.log(`❌ Battle ${battleId} not found`);
        return;
      }

      const casts = await this.db.getCastsForBattle(battleId);
      if (casts.length === 0) {
        console.log(`⚠️ No casts found for battle ${battleId}, completing without winners`);
        await this.db.completeBattle(battleId, []);
        return;
      }

      console.log(`📊 Found ${casts.length} casts for battle ${battleId}`);

      // Use Agent Orchestrator for AI-powered judging
      const { AgentOrchestrator } = await import('../agents/agent-orchestrator');
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

        // Complete battle with winners
        await this.db.completeBattle(battleId, winners);
        
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
        console.log(`💡 Insights generated: ${result.judgment.insights ? 'Yes' : 'No'}`);
        
        // Log insights if available
        if (result.judgment.insights) {
          console.log(`🔍 Battle insights: ${result.judgment.insights.substring(0, 100)}...`);
        }
      } else {
        console.log(`⚠️ AI judging failed for battle ${battleId}, completing without winners`);
        await this.db.completeBattle(battleId, []);
      }

    } catch (error) {
      console.error(`❌ Error completing battle ${battleId} with AI judging:`, error);
      
      // Fallback: complete battle without winners
      try {
        await this.db.completeBattle(battleId, []);
        console.log(`⚠️ Battle ${battleId} completed without winners due to error`);
      } catch (fallbackError) {
        console.error(`❌ Failed to complete battle ${battleId} even with fallback:`, fallbackError);
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
    if (!this.config.enabled) {
      throw new Error('Battle generation is disabled');
    }
    
    console.log('Manually triggering battle generation...');
    await this.checkAndCreateBattle();
  }

  /**
   * Join a battle
   */
  async joinBattle(userAddress: string): Promise<boolean> {
    try {
      const currentBattle = await this.getCurrentBattle();
      if (!currentBattle) {
        throw new Error('No active battle available');
      }

      // Create or get user
      const user = await this.db.createOrUpdateUser(userAddress);
      
      // Join battle
      await this.db.joinBattle(user.id, currentBattle.id);
      
      console.log(`User ${userAddress} joined battle ${currentBattle.id}`);
      return true;
    } catch (error) {
      console.error('Error joining battle:', error);
      throw error; // Re-throw the error to preserve the original message
    }
  }

  /**
   * Check if user has joined current battle
   */
  async hasUserJoinedBattle(userAddress: string): Promise<boolean> {
    try {
      const currentBattle = await this.getCurrentBattle();
      if (!currentBattle) {
        return false;
      }

      const user = await this.db.getUserByAddress(userAddress);
      if (!user) {
        return false;
      }

      return await this.db.hasUserJoinedBattle(user.id, currentBattle.id);
    } catch (error) {
      console.error('Error checking battle participation:', error);
      return false;
    }
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

  /**
   * Create a cast for a battle
   */
  async createCast(userAddress: string, content: string, side: 'SUPPORT' | 'OPPOSE') {
    try {
      const currentBattle = await this.getCurrentBattle();
      if (!currentBattle) {
        throw new Error('No active battle available');
      }

      const user = await this.db.createOrUpdateUser(userAddress);
      
      return await this.db.createCast(user.id, currentBattle.id, content, side);
    } catch (error) {
      console.error('Error creating cast:', error);
      throw error;
    }
  }

  /**
   * Get casts for current battle
   */
  async getCurrentBattleCasts() {
    const currentBattle = await this.getCurrentBattle();
    if (!currentBattle) {
      return [];
    }

    return await this.db.getCastsForBattle(currentBattle.id);
  }
}
