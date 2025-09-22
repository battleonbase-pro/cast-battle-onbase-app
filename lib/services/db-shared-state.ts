/**
 * Database-Based Shared State Manager
 * Uses database to maintain shared state across all instances
 */

import { DatabaseService } from './database';

interface SharedState {
  id: string;
  rateLimitCooldown: Date | null;
  lastUpdated: Date;
  createdAt: Date;
}

export class DBSharedStateManager {
  private static instance: DBSharedStateManager;
  private db: DatabaseService;
  private readonly STATE_KEY = 'battle_manager_state';

  static getInstance(): DBSharedStateManager {
    if (!DBSharedStateManager.instance) {
      DBSharedStateManager.instance = new DBSharedStateManager();
    }
    return DBSharedStateManager.instance;
  }

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  private async getState(): Promise<SharedState | null> {
    try {
      const state = await this.db.prisma.sharedState.findUnique({
        where: { key: this.STATE_KEY }
      });
      
      if (!state) {
        return null;
      }

      return {
        id: state.id,
        rateLimitCooldown: state.rateLimitCooldown,
        lastUpdated: state.lastUpdated,
        createdAt: state.createdAt
      };
    } catch (error) {
      console.error('Error reading shared state from database:', error);
      return null;
    }
  }

  private async setState(state: Partial<SharedState>): Promise<void> {
    try {
      await this.db.prisma.sharedState.upsert({
        where: { key: this.STATE_KEY },
        update: {
          rateLimitCooldown: state.rateLimitCooldown,
          lastUpdated: new Date()
        },
        create: {
          key: this.STATE_KEY,
          rateLimitCooldown: state.rateLimitCooldown,
          lastUpdated: new Date(),
          createdAt: new Date()
        }
      });
      
      console.log('📝 Database shared state updated - Rate limit cooldown:', state.rateLimitCooldown ? state.rateLimitCooldown.toISOString() : 'null');
    } catch (error) {
      console.error('Error writing shared state to database:', error);
    }
  }

  async getRateLimitCooldown(): Promise<Date | null> {
    const state = await this.getState();
    return state?.rateLimitCooldown || null;
  }

  async setRateLimitCooldown(cooldown: Date | null): Promise<void> {
    await this.setState({ rateLimitCooldown: cooldown });
  }

  async isCooldownActive(): Promise<boolean> {
    const cooldown = await this.getRateLimitCooldown();
    return cooldown ? new Date() < cooldown : false;
  }

  async getRemainingMinutes(): Promise<number> {
    const cooldown = await this.getRateLimitCooldown();
    if (!cooldown) return 0;
    const remaining = Math.ceil((cooldown.getTime() - Date.now()) / (1000 * 60));
    return Math.max(0, remaining);
  }

  async getStateInfo(): Promise<{ cooldown: Date | null; isActive: boolean; remainingMinutes: number }> {
    const cooldown = await this.getRateLimitCooldown();
    const isActive = cooldown ? new Date() < cooldown : false;
    const remainingMinutes = cooldown ? Math.ceil((cooldown.getTime() - Date.now()) / (1000 * 60)) : 0;
    
    return {
      cooldown,
      isActive,
      remainingMinutes: Math.max(0, remainingMinutes)
    };
  }
}
