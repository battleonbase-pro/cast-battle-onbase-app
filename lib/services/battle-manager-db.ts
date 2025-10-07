/**
 * Database-Powered Battle Manager Service
 * Handles automatic battle generation and management with persistent storage
 */

import NewsService from './news-service';
import { DatabaseService } from './database';
import { broadcastBattleEvent } from './battle-broadcaster';
import { DBSharedStateManager } from './db-shared-state';

export interface BattleConfig {
  battleDurationHours: number;
  maxParticipants: number;
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
  private isCompletingBattle: boolean = false;
  private scheduledTimeouts: Set<NodeJS.Timeout> = new Set();

  constructor() {
    this.config = {
      battleDurationHours: parseFloat(process.env.BATTLE_DURATION_HOURS || '0.05'), // 3 minutes
      maxParticipants: parseInt(process.env.BATTLE_MAX_PARTICIPANTS || '1000')
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
    console.log(`Battle Manager initialized with ${this.config.battleDurationHours}h intervals`);
    
    // Cleanup any expired battles first
    const cleanedCount = await this.db.cleanupExpiredBattles();
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired battles`);
    }

    // Check for duration configuration changes and complete current battle if needed
    await this.checkForDurationChange();
    
    // Set up automatic generation (this will handle battle creation timing)
    this.setupAutomaticGeneration();
  }

  /**
   * Ensure a battle exists (called by API endpoints)
   * This is the main entry point for server-side battle management
   */
  async ensureBattleExists(): Promise<void> {
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
          console.log(`✅ Initial battle created successfully`);
          
          // Schedule the next battle after this initial one
          console.log(`🔄 Scheduling battle completion for initial battle`);
          await this.scheduleBattleCompletion();
        } catch (error) {
          console.log('❌ Could not create new battle, will retry later:', error);
          // Schedule retry
          setTimeout(() => this.scheduleBattleCompletion(), 30000);
        }
      } else {
        // Check if current battle has expired
        const now = new Date();
        if (now > currentBattle.endTime && currentBattle.status === 'ACTIVE') {
          console.log(`Current battle "${currentBattle.title}" has expired, completing it and creating new one...`);
          
          // Emit SSE event for battle ending
          broadcastBattleEvent('BATTLE_ENDED', {
            battleId: currentBattle.id,
            title: currentBattle.title,
            timestamp: new Date().toISOString()
          });
          
          // Emit status update for judging phase
          console.log(`📡 Broadcasting statusUpdate event: Battle completed! Judging in progress...`);
          broadcastBattleEvent('STATUS_UPDATE', {
            message: '🏁 Battle completed! Judging in progress...',
            type: 'info',
            timestamp: new Date().toISOString()
          });
          
          // Complete the expired battle with AI-powered judging
          console.log(`🔄 Starting battle completion process for ${currentBattle.id}`);
          await this.completeBattleWithJudging(currentBattle.id);
          console.log(`✅ Battle completion process finished for ${currentBattle.id}`);
          
          // Emit status update for new battle generation
          console.log(`📡 Broadcasting statusUpdate event: Generating new battle...`);
          broadcastBattleEvent('STATUS_UPDATE', {
            message: '🔄 Generating new battle...',
            type: 'info',
            timestamp: new Date().toISOString()
          });
          
          // Create a new battle immediately after completion
          try {
            console.log(`🔄 Creating new battle after completing ${currentBattle.id}`);
            await this.createNewBattle();
            console.log(`✅ New battle created successfully`);
            
            // Schedule the next battle after this new one
            console.log(`🔄 Scheduling battle completion for new battle`);
            await this.scheduleBattleCompletion();
          } catch (error) {
            console.log('❌ Could not create new battle after completing expired one, will retry later:', error);
            // Schedule retry
            setTimeout(() => this.scheduleBattleCompletion(), 30000);
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
        broadcastBattleEvent('BATTLE_ENDED', {
          battleId: currentBattle.id,
          title: currentBattle.title,
          reason: 'duration_change',
          timestamp: new Date().toISOString()
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
      console.log(`📡 Broadcasting battleStarted event for new battle: ${battle.title} (${battle.id})`);
      broadcastBattleEvent('BATTLE_STARTED', {
        battleId: battle.id,
        title: battle.title,
        description: battle.description,
        category: battle.category,
        source: battle.source,
        sourceUrl: battle.sourceUrl,
        endTime: battle.endTime,
        timestamp: new Date().toISOString()
      });

      // Schedule completion for this new battle
      await this.scheduleBattleCompletion();

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
   * Set up battle generation with duration-based scheduling
   */
  private async setupAutomaticGeneration(): Promise<void> {
    console.log(`🕐 Setting up battle generation with duration-based scheduling`);
    
    // Clear any existing timeouts first
    this.clearScheduledTimeouts();
    
    // Check if there's already an active battle
    const currentBattle = await this.db.getCurrentBattle();
    
    if (currentBattle) {
      console.log(`📊 Found existing active battle: "${currentBattle.title}"`);
      console.log(`⏰ Battle ends at: ${currentBattle.endTime}`);
      
      // Calculate when this battle will end and schedule the next one
      const timeUntilEnd = new Date(currentBattle.endTime).getTime() - Date.now();
      if (timeUntilEnd > 0) {
        console.log(`⏰ Current battle has ${Math.floor(timeUntilEnd / 1000)}s remaining`);
        // Schedule battle completion for the existing battle
        await this.scheduleBattleCompletion();
      } else {
        // Battle already expired, complete it immediately
        console.log(`⚠️ Current battle has already expired, completing it now`);
        await this.handleBattleCompletion(currentBattle.id);
      }
    } else {
      console.log(`📊 No active battle found, creating initial battle`);
      // No active battle, create one immediately
      await this.checkAndCreateBattle();
    }
  }

  /**
   * Handle complete battle flow: completion → judging → winner selection → new battle
   */
  private async handleBattleCompletion(battleId: string): Promise<void> {
    // Prevent duplicate completions
    if (this.isCompletingBattle) {
      console.log(`🔄 Battle completion already in progress, skipping duplicate for ${battleId}`);
      return;
    }

    try {
      this.isCompletingBattle = true;
      console.log(`🏁 Starting complete battle flow for battle ${battleId}`);
      
      // Get battle info for events before completing it
      const battleInfo = await this.db.getBattleById(battleId);
      console.log(`🏁 Battle info for events:`, battleInfo ? { id: battleInfo.id, title: battleInfo.title } : 'No battle found');
      
      // Emit SSE event for battle ending
      if (battleInfo) {
        console.log(`📡 Broadcasting battleEnded event for battle: ${battleInfo.title} (${battleInfo.id})`);
        broadcastBattleEvent('BATTLE_ENDED', {
          battleId: battleInfo.id,
          title: battleInfo.title,
          timestamp: new Date().toISOString()
        });
        
        // Emit status update for judging phase
        console.log(`📡 Broadcasting statusUpdate event: Battle completed! Judging in progress...`);
        broadcastBattleEvent('STATUS_UPDATE', {
          message: '🏁 Battle completed! Judging in progress...',
          type: 'info',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`❌ No battle found for ID ${battleId}, cannot emit battleEnded event`);
      }
      
      // Step 1: Complete the battle with AI judging and winner selection
      const completionResult = await this.completeBattleWithJudging(battleId);
      
      // Step 2: Ensure winner selection is fully completed before proceeding
      if (completionResult.success) {
        console.log(`✅ Winner selection completed successfully for battle ${battleId}`);
        
        // Emit status update for new battle generation
        console.log(`📡 Broadcasting statusUpdate event: Generating new battle...`);
        broadcastBattleEvent('STATUS_UPDATE', {
          message: '🔄 Generating new battle...',
          type: 'info',
          timestamp: new Date().toISOString()
        });
        
        // Step 3: Wait a moment to ensure all database operations are committed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Create new battle after completion
        console.log(`🔄 Creating new battle after completing ${battleId}`);
        await this.createNewBattle();
        
        // Step 5: Schedule the next battle after this new one
        console.log(`🔄 Scheduling battle completion for new battle`);
        await this.scheduleBattleCompletion();
        
        console.log(`✅ Complete battle flow finished for ${battleId}`);
      } else {
        console.log(`⚠️ Winner selection failed for battle ${battleId}, retrying...`);
        // Retry after a delay
        setTimeout(() => this.scheduleBattleCompletion(), 30000);
      }
    } catch (error: any) {
      console.error(`❌ Error in complete battle flow for ${battleId}:`, error);
      // Schedule retry
      setTimeout(() => this.scheduleBattleCompletion(), 30000);
    } finally {
      this.isCompletingBattle = false;
    }
  }

  /**
   * Schedule battle completion for the current active battle
   */
  private async scheduleBattleCompletion(): Promise<void> {
    
    // Clear any existing scheduled timeouts to prevent duplicates
    this.clearScheduledTimeouts();
    
    // Get the current active battle
    const currentBattle = await this.db.getCurrentBattle();
    if (!currentBattle) {
      console.log('⚠️ No active battle found to schedule completion for');
      return;
    }
    
    
    // Calculate when this battle will expire
    const battleEndTime = new Date(currentBattle.endTime).getTime();
    const now = Date.now();
    const timeUntilEnd = battleEndTime - now;
    
    if (timeUntilEnd <= 0) {
      console.log(`⚠️ Battle ${currentBattle.id} has already expired, completing immediately`);
      await this.handleBattleCompletion(currentBattle.id);
      return;
    }
    
    console.log(`⏰ Scheduling battle completion for "${currentBattle.title}" in ${Math.floor(timeUntilEnd / 1000)}s`);
    
    const timeoutId = setTimeout(async () => {
      console.log(`⏰ Battle "${currentBattle.title}" expired, starting completion process`);
      try {
        await this.handleBattleCompletion(currentBattle.id);
      } catch (error) {
        console.error('Error in scheduled battle completion:', error);
        // Retry after a short delay
        setTimeout(() => this.scheduleBattleCompletion(), 30000);
      }
    }, timeUntilEnd);
    
    // Track the timeout
    this.scheduledTimeouts.add(timeoutId);
  }

  /**
   * Clear all scheduled timeouts to prevent duplicates
   */
  private clearScheduledTimeouts(): void {
    this.scheduledTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.scheduledTimeouts.clear();
    console.log(`🧹 Cleared ${this.scheduledTimeouts.size} scheduled timeouts`);
  }

  /**
   * Complete battle with AI-powered judging using optimized hybrid method
   * Returns success status to ensure completion before proceeding
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

        // Complete battle with winners
        await this.db.completeBattle(battleId, winners);
        
        // Award 100 points to the winner
        try {
          const winnerUser = await this.db.getUserById(winner.userId);
          if (winnerUser) {
            const newPoints = await this.db.awardParticipationPoints(winnerUser.address, 100);
            console.log(`🎉 Winner ${winnerUser.address} awarded 100 points! Total points: ${newPoints}`);
            
            // Emit status update for winner announcement
            console.log(`📡 Broadcasting statusUpdate event: Winner selected!`);
            broadcastBattleEvent('STATUS_UPDATE', {
              message: `🏆 Winner selected! ${winnerUser.address.slice(0, 6)}...${winnerUser.address.slice(-4)} won!`,
              type: 'success',
              timestamp: new Date().toISOString()
            });

            // Emit leaderboard update event
            console.log(`📡 Broadcasting LEADERBOARD_UPDATE event`);
            broadcastBattleEvent('LEADERBOARD_UPDATE', {
              message: 'Leaderboard updated with new winner!',
              winner: {
                address: winnerUser.address,
                pointsAwarded: 100,
                newTotalPoints: newPoints
              },
              timestamp: new Date().toISOString()
            });
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
