/**
 * Battle Completion Worker Service
 * Optimized for production deployment on Google Cloud Run
 * 
 * Features:
 * - Timer-based battle completion (no polling!)
 * - Precise scheduling based on battle expiration times
 * - Health check endpoint
 * - Graceful shutdown handling
 * - Error recovery and retry logic
 * - Comprehensive logging
 * - Fallback to interval-based checking if needed
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { BattleManagerDB } from './lib/services/battle-manager-db';
import { addTimerConnection, removeTimerConnectionById, broadcastTimerUpdate, broadcastBattleTransition } from './lib/services/timer-broadcaster';

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
  private battleTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
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
      await this.battleManager.initialize();
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

    // Perform initial check and set up timer-based scheduling
    this.performBattleCheck();

    // Start continuous countdown timer for real-time updates
    this.startCountdownTimer();

    console.log('✅ Battle completion worker started (timer-based scheduling + countdown)');
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

    if (this.battleTimer) {
      clearTimeout(this.battleTimer);
      this.battleTimer = null;
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
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
      
      // Set up timer for next battle expiration
      await this.scheduleNextBattleCheck();
      
      // Note: Timer updates are now handled by continuous countdown timer
      
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
      
      // Fallback to interval-based checking if timer scheduling fails
      this.scheduleFallbackCheck();
    }
  }

  private async checkAndCompleteExpiredBattles(): Promise<void> {
    if (!this.battleManager) {
      throw new Error('Battle Manager not initialized');
    }

    await this.battleManager.checkAndCompleteExpiredBattles();
  }

  /**
   * Schedule the next battle check based on current battle expiration time
   */
  private async scheduleNextBattleCheck(): Promise<void> {
    try {
      if (!this.battleManager) {
        throw new Error('Battle Manager not initialized');
      }

      // Get current battle to determine when it expires
      const currentBattle = await this.battleManager.getCurrentBattle();
      
      if (currentBattle && currentBattle.status === 'ACTIVE') {
        const now = new Date();
        const timeUntilExpiry = currentBattle.endTime.getTime() - now.getTime();
        
        if (timeUntilExpiry > 0) {
          // Clear any existing timer
          if (this.battleTimer) {
            clearTimeout(this.battleTimer);
          }
          
          // Set timer to trigger exactly when battle expires
          this.battleTimer = setTimeout(async () => {
            console.log(`⏰ Battle "${currentBattle.title}" expired, triggering check...`);
            await this.performBattleCheck();
          }, timeUntilExpiry);
          
          const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
          const minutesUntilExpiry = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
          
          console.log(`⏰ Timer set for battle "${currentBattle.title}" to expire in ${hoursUntilExpiry}h ${minutesUntilExpiry}m`);
          
          // Broadcast battle transition to connected clients
          try {
            broadcastBattleTransition({
              battleId: currentBattle.id,
              title: currentBattle.title,
              endTime: currentBattle.endTime.toISOString(),
              status: currentBattle.status
            });
          } catch (error) {
            console.error('Error broadcasting battle transition:', error);
          }
        } else {
          console.log('⚠️ Current battle has already expired, triggering immediate check');
          await this.performBattleCheck();
        }
      } else {
        console.log('ℹ️ No active battle found, will check again in 1 minute');
        this.scheduleFallbackCheck(60000); // 1 minute fallback
      }
    } catch (error) {
      console.error('❌ Failed to schedule next battle check:', error);
      this.scheduleFallbackCheck();
    }
  }

  /**
   * Fallback to interval-based checking if timer scheduling fails
   */
  private scheduleFallbackCheck(intervalMs: number = 5 * 60 * 1000): void {
    console.log(`🔄 Scheduling fallback check in ${intervalMs / 1000}s`);
    
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Set up fallback interval
    this.intervalId = setInterval(async () => {
      console.log('🔄 Fallback check triggered');
      await this.performBattleCheck();
    }, intervalMs);
  }

  /**
   * Start continuous countdown timer for real-time updates
   */
  private startCountdownTimer(): void {
    console.log('⏰ Starting continuous countdown timer...');
    
    // Clear any existing countdown timer
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    
    // Set up countdown timer to broadcast updates every 5 seconds
    this.countdownTimer = setInterval(async () => {
      try {
        const timingInfo = await this.getBattleTimingInfo();
        
        // Only broadcast if there's an active battle
        if (timingInfo.battleId && timingInfo.timeRemaining > 0) {
          broadcastTimerUpdate(timingInfo);
        }
      } catch (error) {
        console.error('Error in countdown timer:', error);
      }
    }, 5000); // Every 5 seconds
    
    console.log('✅ Continuous countdown timer started');
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

  // Get current battle timing info for SSE clients
  async getBattleTimingInfo(): Promise<{
    battleId: string | null;
    timeRemaining: number;
    endTime: string | null;
    status: string | null;
    title: string | null;
  }> {
    if (!this.battleManager) {
      throw new Error('Battle Manager not initialized');
    }

    try {
      const currentBattle = await this.battleManager.getCurrentBattle();
      
      if (currentBattle && currentBattle.status === 'ACTIVE') {
        const now = new Date();
        const timeRemaining = Math.max(0, Math.floor((currentBattle.endTime.getTime() - now.getTime()) / 1000));
        
        return {
          battleId: currentBattle.id,
          timeRemaining,
          endTime: currentBattle.endTime.toISOString(),
          status: currentBattle.status,
          title: currentBattle.title
        };
      } else {
        return {
          battleId: null,
          timeRemaining: 0,
          endTime: null,
          status: null,
          title: null
        };
      }
    } catch (error) {
      console.error('Error getting battle timing info:', error);
      throw error;
    }
  }

  // Get battle manager status for /status endpoint
  async getBattleManagerStatus(): Promise<{
    success: boolean;
    status: string;
    config: unknown;
    currentBattle: unknown;
  }> {
    if (!this.battleManager) {
      throw new Error('Battle Manager not initialized');
    }

    try {
      const config = this.battleManager.getConfig();
      const currentBattle = await this.battleManager.getCurrentBattle();
      
      return {
        success: true,
        status: 'running',
        config,
        currentBattle: currentBattle ? {
          id: currentBattle.id,
          status: currentBattle.status,
          title: currentBattle.title,
          participants: currentBattle.participants.length,
          endTime: currentBattle.endTime
        } : null
      };
    } catch (error) {
      console.error('❌ Failed to get battle manager status:', error);
      throw error;
    }
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

// HTTP Server for worker endpoints (optional - for monitoring)

// Handle Timer SSE Stream
function handleTimerSSE(req: IncomingMessage, res: ServerResponse) {
  const connectionId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`⏰ NEW TIMER CLIENT CONNECTED: ${connectionId}`);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection confirmation
  const initialData = {
    type: 'CONNECTION_ESTABLISHED',
    connectionId,
    timestamp: new Date().toISOString()
  };
  
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Create controller-like object for compatibility
  const controller = {
    enqueue: (data: Uint8Array) => {
      try {
        res.write(data);
      } catch (error) {
        console.error('Error writing to timer SSE connection:', error);
        removeTimerConnectionById(connectionId);
      }
    },
    desiredSize: 1, // Always writable initially
    close: () => {
      try {
        res.end();
      } catch (error) {
        console.error('Error closing timer SSE connection:', error);
      }
    },
    error: (_error: Error) => {
      try {
        res.writeHead(500);
        res.end();
      } catch (err) {
        console.error('Error handling timer SSE error:', err);
      }
    }
  } as ReadableStreamDefaultController;

  // Add connection to broadcaster
  addTimerConnection({ id: connectionId, controller });

  // Send initial timer data
  worker.getBattleTimingInfo().then(timingInfo => {
    const timerData = {
      type: 'TIMER_UPDATE',
      data: timingInfo,
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(timerData)}\n\n`);
  }).catch(error => {
    console.error('Error sending initial timer data:', error);
  });

  // Handle client disconnect
  req.on('close', () => {
    console.log(`⏰ TIMER CLIENT DISCONNECTED: ${connectionId}`);
    removeTimerConnectionById(connectionId);
  });

  req.on('error', (error) => {
    console.error(`⏰ Timer SSE connection error for ${connectionId}:`, error);
    removeTimerConnectionById(connectionId);
  });
}

// API Key validation helper
const validateApiKey = (req: IncomingMessage): boolean => {
  const apiKey = process.env.WORKER_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ WORKER_API_KEY not set - API key validation disabled');
    return true; // Allow access if no API key is set
  }
  
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const providedKey = apiKeyHeader || (typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '');
  return providedKey === apiKey;
};

const createWorkerServer = () => {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Validate API key for all endpoints except health check and timer endpoints
    if (url.pathname !== '/health' && url.pathname !== '/timer-sync' && url.pathname !== '/timer-stream' && !validateApiKey(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized - Invalid API key' }));
      return;
    }
    
    try {
      switch (url.pathname) {
        case '/health':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(worker.getStatus()));
          break;
          
        case '/status':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(await worker.getBattleManagerStatus()));
          break;
          
          
        case '/trigger':
          if (req.method === 'POST') {
            await worker.triggerManualCheck();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Manual check triggered' }));
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          }
          break;
          
        case '/timer-sync':
          if (req.method === 'GET') {
            const timingInfo = await worker.getBattleTimingInfo();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: timingInfo }));
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          }
          break;
          
        case '/timer-stream':
          if (req.method === 'GET') {
            // Handle SSE timer stream
            handleTimerSSE(req, res);
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          }
          break;
          
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('❌ Worker HTTP error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }
  });
  
  return server;
};

// Start the worker
console.log('🌟 Battle Completion Worker starting...');
startWorker().catch((error) => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});

// Start HTTP server for monitoring (optional)
const port = process.env.PORT || process.env.WORKER_PORT || 3001;
const server = createWorkerServer();
server.listen(port, () => {
  console.log(`🌐 Worker HTTP server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📊 Status: http://localhost:${port}/status`);
  console.log(`🔧 Manual trigger: POST http://localhost:${port}/trigger`);
  console.log(`🚀 Worker is fully independent - no external initialization required`);
});

export default worker;
