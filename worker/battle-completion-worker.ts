/**
 * Battle Completion Worker Service
 * Optimized for production deployment on Railway, Render, Fly.io, etc.
 * 
 * Features:
 * - Automatic battle completion every 5 minutes
 * - Health check endpoint
 * - Graceful shutdown handling
 * - Error recovery and retry logic
 * - Comprehensive logging
 */

import { BattleManagerDB } from '../lib/services/battle-manager-db';

interface WorkerStatus {
  isRunning: boolean;
  battleManagerInitialized: boolean;
  lastSuccessfulCheck: string | null;
  retryCount: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

class BattleCompletionWorker {
  private battleManager: BattleManagerDB | null = null;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private lastSuccessfulCheck: Date | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Battle Completion Worker...');
      console.log('📊 Environment:', {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'Set' : 'Not set',
        serperApiKey: process.env.SERPER_API_KEY ? 'Set' : 'Not set'
      });

      this.battleManager = await BattleManagerDB.getInstance();
      console.log('✅ Battle Manager initialized successfully');
      
      // Reset retry count on successful initialization
      this.retryCount = 0;
    } catch (error) {
      console.error('❌ Failed to initialize Battle Manager:', error);
      throw error;
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Worker is already running');
      return;
    }

    console.log('🔄 Starting battle completion worker...');
    this.isRunning = true;

    // Check for expired battles every 5 minutes
    this.intervalId = setInterval(async () => {
      await this.performBattleCheck();
    }, 5 * 60 * 1000); // 5 minutes

    // Perform initial check immediately
    this.performBattleCheck();

    console.log('✅ Battle completion worker started (checking every 5 minutes)');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Worker is not running');
      return;
    }

    console.log('🛑 Stopping battle completion worker...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Battle completion worker stopped');
  }

  private async performBattleCheck(): Promise<void> {
    const startTime = new Date();
    console.log(`🕐 [${startTime.toISOString()}] Starting battle completion check...`);

    try {
      await this.checkAndCompleteExpiredBattles();
      
      // Reset retry count on successful check
      this.retryCount = 0;
      this.lastSuccessfulCheck = new Date();
      
      const duration = Date.now() - startTime.getTime();
      console.log(`✅ [${new Date().toISOString()}] Battle check completed successfully in ${duration}ms`);
      
    } catch (error) {
      this.retryCount++;
      console.error(`❌ [${new Date().toISOString()}] Battle check failed (attempt ${this.retryCount}/${this.maxRetries}):`, error);
      
      // If we've exceeded max retries, try to reinitialize
      if (this.retryCount >= this.maxRetries) {
        console.log('🔄 Max retries exceeded, attempting to reinitialize...');
        try {
          await this.initialize();
          this.retryCount = 0;
        } catch (initError) {
          console.error('❌ Failed to reinitialize worker:', initError);
        }
      }
    }
  }

  private async checkAndCompleteExpiredBattles(): Promise<void> {
    if (!this.battleManager) {
      throw new Error('Battle Manager not initialized');
    }

    await this.battleManager.checkAndCompleteExpiredBattles();
  }

  // Health check endpoint for monitoring
  getStatus(): WorkerStatus {
    return {
      isRunning: this.isRunning,
      battleManagerInitialized: this.battleManager !== null,
      lastSuccessfulCheck: this.lastSuccessfulCheck?.toISOString() || null,
      retryCount: this.retryCount,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Manual trigger for testing
  async triggerManualCheck(): Promise<void> {
    console.log('🔧 Manual battle check triggered');
    await this.performBattleCheck();
  }
}

// Create worker instance
const worker = new BattleCompletionWorker();

// Initialize and start worker
async function startWorker(): Promise<void> {
  try {
    await worker.initialize();
    worker.start();
    
    // Log status every hour for monitoring
    setInterval(() => {
      const status = worker.getStatus();
      console.log('📊 Worker Status:', {
        isRunning: status.isRunning,
        lastSuccessfulCheck: status.lastSuccessfulCheck,
        retryCount: status.retryCount,
        uptime: `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`
      });
    }, 60 * 60 * 1000); // Every hour
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const gracefulShutdown = (signal: string): void => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  worker.stop();
  
  // Give some time for cleanup
  setTimeout(() => {
    console.log('👋 Worker shutdown complete');
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the worker
console.log('🌟 Battle Completion Worker starting...');
startWorker();

export default worker;
