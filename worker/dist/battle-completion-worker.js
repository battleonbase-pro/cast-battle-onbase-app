"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = require("http");
const battle_manager_db_1 = require("./lib/services/battle-manager-db");
const timer_broadcaster_1 = require("./lib/services/timer-broadcaster");
class BattleCompletionWorker {
    constructor() {
        this.battleManager = null;
        this.isRunning = false;
        this.intervalId = null;
        this.battleTimer = null;
        this.countdownTimer = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.lastSuccessfulCheck = null;
    }
    async initialize() {
        try {
            console.log('🚀 Initializing Battle Completion Worker...');
            console.log('📊 Environment:', {
                nodeEnv: process.env.NODE_ENV,
                databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
                googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'Set' : 'Not set',
                serperApiKey: process.env.SERPER_API_KEY ? 'Set' : 'Not set'
            });
            this.battleManager = await battle_manager_db_1.BattleManagerDB.getInstance();
            await this.battleManager.initialize();
            console.log('✅ Battle Manager initialized successfully');
            this.retryCount = 0;
        }
        catch (error) {
            console.error('❌ Failed to initialize Battle Manager:', error);
            throw error;
        }
    }
    start() {
        if (this.isRunning) {
            console.log('⚠️ Worker is already running');
            return;
        }
        console.log('🔄 Starting battle completion worker...');
        this.isRunning = true;
        this.performBattleCheck();
        this.startCountdownTimer();
        console.log('✅ Battle completion worker started (timer-based scheduling + countdown)');
    }
    stop() {
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
    async performBattleCheck() {
        const startTime = new Date();
        console.log(`🕐 [${startTime.toISOString()}] Starting battle completion check...`);
        try {
            await this.checkAndCompleteExpiredBattles();
            this.retryCount = 0;
            this.lastSuccessfulCheck = new Date();
            const duration = Date.now() - startTime.getTime();
            console.log(`✅ [${new Date().toISOString()}] Battle check completed successfully in ${duration}ms`);
            await this.scheduleNextBattleCheck();
        }
        catch (error) {
            this.retryCount++;
            console.error(`❌ [${new Date().toISOString()}] Battle check failed (attempt ${this.retryCount}/${this.maxRetries}):`, error);
            if (this.retryCount >= this.maxRetries) {
                console.log('🔄 Max retries exceeded, attempting to reinitialize...');
                try {
                    await this.initialize();
                    this.retryCount = 0;
                }
                catch (initError) {
                    console.error('❌ Failed to reinitialize worker:', initError);
                }
            }
            this.scheduleFallbackCheck();
        }
    }
    async checkAndCompleteExpiredBattles() {
        if (!this.battleManager) {
            throw new Error('Battle Manager not initialized');
        }
        await this.battleManager.checkAndCompleteExpiredBattles();
    }
    async scheduleNextBattleCheck() {
        try {
            if (!this.battleManager) {
                throw new Error('Battle Manager not initialized');
            }
            const currentBattle = await this.battleManager.getCurrentBattle();
            if (currentBattle && currentBattle.status === 'ACTIVE') {
                const now = new Date();
                const timeUntilExpiry = currentBattle.endTime.getTime() - now.getTime();
                if (timeUntilExpiry > 0) {
                    if (this.battleTimer) {
                        clearTimeout(this.battleTimer);
                    }
                    this.battleTimer = setTimeout(async () => {
                        console.log(`⏰ Battle "${currentBattle.title}" expired, triggering check...`);
                        await this.performBattleCheck();
                    }, timeUntilExpiry);
                    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
                    const minutesUntilExpiry = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
                    console.log(`⏰ Timer set for battle "${currentBattle.title}" to expire in ${hoursUntilExpiry}h ${minutesUntilExpiry}m`);
                    try {
                        (0, timer_broadcaster_1.broadcastBattleTransition)({
                            battleId: currentBattle.id,
                            title: currentBattle.title,
                            endTime: currentBattle.endTime.toISOString(),
                            status: currentBattle.status
                        });
                    }
                    catch (error) {
                        console.error('Error broadcasting battle transition:', error);
                    }
                }
                else {
                    console.log('⚠️ Current battle has already expired, triggering immediate check');
                    await this.performBattleCheck();
                }
            }
            else {
                console.log('ℹ️ No active battle found, will check again in 1 minute');
                this.scheduleFallbackCheck(60000);
            }
        }
        catch (error) {
            console.error('❌ Failed to schedule next battle check:', error);
            this.scheduleFallbackCheck();
        }
    }
    scheduleFallbackCheck(intervalMs = 5 * 60 * 1000) {
        console.log(`🔄 Scheduling fallback check in ${intervalMs / 1000}s`);
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(async () => {
            console.log('🔄 Fallback check triggered');
            await this.performBattleCheck();
        }, intervalMs);
    }
    startCountdownTimer() {
        console.log('⏰ Starting continuous countdown timer...');
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        this.countdownTimer = setInterval(async () => {
            try {
                const timingInfo = await this.getBattleTimingInfo();
                if (timingInfo.battleId && timingInfo.timeRemaining > 0) {
                    (0, timer_broadcaster_1.broadcastTimerUpdate)(timingInfo);
                }
            }
            catch (error) {
                console.error('Error in countdown timer:', error);
            }
        }, 5000);
        console.log('✅ Continuous countdown timer started');
    }
    getStatus() {
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
    async triggerManualCheck() {
        console.log('🔧 Manual battle check triggered');
        await this.performBattleCheck();
    }
    async getBattleTimingInfo() {
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
            }
            else {
                return {
                    battleId: null,
                    timeRemaining: 0,
                    endTime: null,
                    status: null,
                    title: null
                };
            }
        }
        catch (error) {
            console.error('Error getting battle timing info:', error);
            throw error;
        }
    }
    async getBattleManagerStatus() {
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
        }
        catch (error) {
            console.error('❌ Failed to get battle manager status:', error);
            throw error;
        }
    }
}
const worker = new BattleCompletionWorker();
async function startWorker() {
    try {
        await worker.initialize();
        worker.start();
        setInterval(() => {
            const status = worker.getStatus();
            console.log('📊 Worker Status:', {
                isRunning: status.isRunning,
                lastSuccessfulCheck: status.lastSuccessfulCheck,
                retryCount: status.retryCount,
                uptime: `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`
            });
        }, 60 * 60 * 1000);
    }
    catch (error) {
        console.error('❌ Failed to start worker:', error);
        process.exit(1);
    }
}
const gracefulShutdown = (signal) => {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    worker.stop();
    setTimeout(() => {
        console.log('👋 Worker shutdown complete');
        process.exit(0);
    }, 5000);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
function handleTimerSSE(req, res) {
    const connectionId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`⏰ NEW TIMER CLIENT CONNECTED: ${connectionId}`);
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    const initialData = {
        type: 'CONNECTION_ESTABLISHED',
        connectionId,
        timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);
    const controller = {
        enqueue: (data) => {
            try {
                res.write(data);
            }
            catch (error) {
                console.error('Error writing to timer SSE connection:', error);
                (0, timer_broadcaster_1.removeTimerConnectionById)(connectionId);
            }
        },
        desiredSize: 1,
        close: () => {
            try {
                res.end();
            }
            catch (error) {
                console.error('Error closing timer SSE connection:', error);
            }
        },
        error: (_error) => {
            try {
                res.writeHead(500);
                res.end();
            }
            catch (err) {
                console.error('Error handling timer SSE error:', err);
            }
        }
    };
    (0, timer_broadcaster_1.addTimerConnection)({ id: connectionId, controller });
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
    req.on('close', () => {
        console.log(`⏰ TIMER CLIENT DISCONNECTED: ${connectionId}`);
        (0, timer_broadcaster_1.removeTimerConnectionById)(connectionId);
    });
    req.on('error', (error) => {
        console.error(`⏰ Timer SSE connection error for ${connectionId}:`, error);
        (0, timer_broadcaster_1.removeTimerConnectionById)(connectionId);
    });
}
const validateApiKey = (req) => {
    const apiKey = process.env.WORKER_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ WORKER_API_KEY not set - API key validation disabled');
        return true;
    }
    const apiKeyHeader = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    const providedKey = apiKeyHeader || (typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '');
    return providedKey === apiKey;
};
const createWorkerServer = () => {
    const server = (0, http_1.createServer)(async (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
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
                    }
                    else {
                        res.writeHead(405, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Method not allowed' }));
                    }
                    break;
                case '/timer-sync':
                    if (req.method === 'GET') {
                        const timingInfo = await worker.getBattleTimingInfo();
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, data: timingInfo }));
                    }
                    else {
                        res.writeHead(405, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Method not allowed' }));
                    }
                    break;
                case '/timer-stream':
                    if (req.method === 'GET') {
                        handleTimerSSE(req, res);
                    }
                    else {
                        res.writeHead(405, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Method not allowed' }));
                    }
                    break;
                default:
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
            }
        }
        catch (error) {
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
console.log('🌟 Battle Completion Worker starting...');
startWorker().catch((error) => {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
});
const port = process.env.PORT || process.env.WORKER_PORT || 3001;
const server = createWorkerServer();
server.listen(port, () => {
    console.log(`🌐 Worker HTTP server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📊 Status: http://localhost:${port}/status`);
    console.log(`🔧 Manual trigger: POST http://localhost:${port}/trigger`);
    console.log(`🚀 Worker is fully independent - no external initialization required`);
});
exports.default = worker;
