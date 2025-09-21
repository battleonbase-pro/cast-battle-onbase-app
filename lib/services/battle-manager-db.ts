/**
 * Database-Powered Battle Manager Service
 * Handles automatic battle generation and management with persistent storage
 */

import NewsService from './news-service';
import { DatabaseService } from './database';

export interface BattleConfig {
  battleDurationHours: number;
  maxParticipants: number;
  enabled: boolean;
}

export class BattleManagerDB {
  private static instance: BattleManagerDB;
  private config: BattleConfig;
  private db: DatabaseService;

  constructor() {
    this.config = {
      battleDurationHours: parseInt(process.env.BATTLE_DURATION_HOURS || '24'),
      maxParticipants: parseInt(process.env.BATTLE_MAX_PARTICIPANTS || '1000'),
      enabled: process.env.BATTLE_GENERATION_ENABLED === 'true'
    };
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): BattleManagerDB {
    if (!BattleManagerDB.instance) {
      BattleManagerDB.instance = new BattleManagerDB();
    }
    return BattleManagerDB.instance;
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
    
    // Check if we need to create a new battle
    await this.checkAndCreateBattle();
  }

  /**
   * Check if we need to create a new battle
   */
  private async checkAndCreateBattle(): Promise<void> {
    try {
      const currentBattle = await this.db.getCurrentBattle();
      
      if (!currentBattle) {
        console.log('No active battle found, creating new one...');
        await this.createNewBattle();
      } else {
        console.log(`Current battle: ${currentBattle.title} (${currentBattle.status})`);
      }
    } catch (error) {
      console.error('Error checking battle status:', error);
    }
  }

  /**
   * Create a new battle automatically
   */
  private async createNewBattle(): Promise<void> {
    try {
      console.log('Creating new automatic battle...');
      
      // Use the news service directly to get a real topic
      const topic = await NewsService.getDailyBattleTopic();
      
      if (!topic) {
        throw new Error('Failed to generate battle topic');
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + (this.config.battleDurationHours * 60 * 60 * 1000));

      const battle = await this.db.createBattle({
        title: topic.title,
        description: topic.description,
        category: topic.category,
        source: topic.source,
        startTime: now,
        endTime: endTime,
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

    } catch (error) {
      console.error('Error creating new battle:', error);
    }
  }

  /**
   * Set up automatic battle generation
   */
  private setupAutomaticGeneration(): void {
    if (!this.config.enabled) {
      return;
    }

    const intervalMs = this.config.battleDurationHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.checkAndCreateBattle();
      } catch (error) {
        console.error('Error in automatic battle generation:', error);
      }
    }, intervalMs);

    console.log(`Automatic battle generation scheduled every ${this.config.battleDurationHours} hours`);
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
