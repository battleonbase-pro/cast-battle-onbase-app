/**
 * Battle Manager Service
 * Handles automatic battle generation and management
 */

import NewsService from './news-service';

export interface BattleConfig {
  battleDurationHours: number;
  maxParticipants: number;
  enabled: boolean;
}

export interface Battle {
  id: string;
  topic: any;
  status: 'active' | 'completed';
  startTime: Date;
  endTime: Date;
  participants: string[];
  winners?: {
    first: string;
    second: string;
    third: string;
  };
  createdAt: Date;
}

export class BattleManager {
  private static instance: BattleManager;
  private currentBattle: Battle | null = null;
  private battleHistory: Battle[] = [];
  private config: BattleConfig;

  constructor() {
    this.config = {
      battleDurationHours: parseFloat(process.env.BATTLE_DURATION_HOURS || '24'),
      maxParticipants: parseInt(process.env.BATTLE_MAX_PARTICIPANTS || '1000'),
      enabled: process.env.BATTLE_GENERATION_ENABLED === 'true'
    };
  }

  static getInstance(): BattleManager {
    if (!BattleManager.instance) {
      BattleManager.instance = new BattleManager();
    }
    return BattleManager.instance;
  }

  /**
   * Initialize automatic battle generation
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Automatic battle generation is disabled');
      return;
    }

    console.log(`Battle Manager initialized with ${this.config.battleDurationHours}h intervals`);
    
    // Check if we need to create a new battle
    await this.checkAndCreateBattle();
    
    // Set up automatic battle generation
    this.setupAutomaticGeneration();
  }

  /**
   * Check if current battle exists and create new one if needed
   */
  private async checkAndCreateBattle(): Promise<void> {
    try {
      // Check if we have a current active battle
      if (!this.currentBattle) {
        await this.createNewBattle();
      } else if (this.isBattleExpired() && this.currentBattle.status === 'active') {
        // Complete the expired battle first
        await this.completeBattle();
        // Clear current battle
        this.currentBattle = null;
        // Then create a new battle
        await this.createNewBattle();
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
        throw new Error('Failed to fetch topic for battle');
      }

      console.log('Successfully fetched topic:', topic.title);

      const now = new Date();
      const endTime = new Date(now.getTime() + (this.config.battleDurationHours * 60 * 60 * 1000));

      this.currentBattle = {
        id: `battle_${Date.now()}`,
        topic: topic,
        status: 'active',
        startTime: now,
        endTime: endTime,
        participants: [],
        createdAt: now
      };

      console.log(`New battle created: ${this.currentBattle.id}`);
      console.log(`Battle topic: ${topic.title}`);
      console.log(`Battle ends at: ${endTime.toISOString()}`);
      
    } catch (error) {
      console.error('Error creating new battle:', error);
    }
  }

  /**
   * Check if current battle is expired
   */
  private isBattleExpired(): boolean {
    if (!this.currentBattle) return true;
    return new Date() > this.currentBattle.endTime;
  }

  /**
   * Complete a battle and determine winners
   */
  private async completeBattle(): Promise<void> {
    if (!this.currentBattle) return;

    console.log(`Completing battle: ${this.currentBattle.id}`);
    
    // Determine winners (for now, mock winners based on participants)
    const participants = this.currentBattle.participants;
    if (participants.length >= 3) {
      this.currentBattle.winners = {
        first: participants[0],
        second: participants[1], 
        third: participants[2]
      };
    } else if (participants.length >= 1) {
      this.currentBattle.winners = {
        first: participants[0],
        second: participants[0],
        third: participants[0]
      };
    }

    this.currentBattle.status = 'completed';
    
    // Add to battle history
    this.battleHistory.unshift(this.currentBattle);
    
    // Keep only last 10 battles in history
    if (this.battleHistory.length > 10) {
      this.battleHistory = this.battleHistory.slice(0, 10);
    }
    
    console.log(`Battle completed with winners:`, this.currentBattle.winners);
  }

  /**
   * Set up automatic battle generation timer
   */
  private setupAutomaticGeneration(): void {
    const intervalMs = this.config.battleDurationHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      await this.checkAndCreateBattle();
    }, intervalMs);

    console.log(`Automatic battle generation scheduled every ${this.config.battleDurationHours} hours`);
  }

  /**
   * Get current battle
   */
  getCurrentBattle(): Battle | null {
    return this.currentBattle;
  }

  /**
   * Join current battle
   */
  async joinBattle(userAddress: string): Promise<boolean> {
    if (!this.currentBattle) {
      throw new Error('No active battle available');
    }

    if (this.currentBattle.participants.length >= this.config.maxParticipants) {
      throw new Error('Battle is full');
    }

    if (this.currentBattle.participants.includes(userAddress)) {
      throw new Error('User already joined this battle');
    }

    this.currentBattle.participants.push(userAddress);
    console.log(`User ${userAddress} joined battle ${this.currentBattle.id}`);
    
    return true;
  }

  /**
   * Get battle configuration
   */
  getConfig(): BattleConfig {
    return { ...this.config };
  }

  /**
   * Get battle history
   */
  getBattleHistory(): Battle[] {
    return [...this.battleHistory];
  }

  /**
   * Update battle configuration
   */
  updateConfig(newConfig: Partial<BattleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Battle configuration updated:', this.config);
  }
}
