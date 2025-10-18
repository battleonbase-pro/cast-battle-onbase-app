"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleManagerDB = void 0;
const database_1 = require("./database");
const debate_oracle_1 = require("./debate-oracle");
class BattleManagerDB {
    constructor() {
        this.config = {
            battleDurationHours: parseFloat(process.env.BATTLE_DURATION_HOURS || '0.0083'),
            maxParticipants: parseInt(process.env.BATTLE_MAX_PARTICIPANTS || '1000')
        };
        this.db = database_1.DatabaseService.getInstance();
        try {
            this.oracle = (0, debate_oracle_1.createDebateOracle)();
            console.log('🔗 Debate Oracle initialized');
        }
        catch (error) {
            console.log('⚠️  Debate Oracle not initialized (contract not deployed yet):', error.message);
            this.oracle = null;
        }
        try {
            const { createOnChainDebateService } = require('./onchain-debate-service');
            this.onChainDebateService = createOnChainDebateService();
            console.log('🔗 OnChainDebateService initialized');
        }
        catch (error) {
            console.log('⚠️  OnChainDebateService not initialized:', error.message);
            this.onChainDebateService = null;
        }
    }
    static async getInstance() {
        return new BattleManagerDB();
    }
    async initialize() {
        console.log(`Worker Battle Manager initialized with ${this.config.battleDurationHours}h intervals`);
        const cleanedCount = await this.db.cleanupExpiredBattles();
        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired battles`);
        }
        await this.checkForDurationChange();
    }
    async checkAndCompleteExpiredBattles() {
        try {
            console.log('🕐 Checking for expired battles...');
            const expiredBattles = await this.db.getExpiredBattles();
            if (expiredBattles.length === 0) {
                console.log('✅ No expired battles found');
            }
            else {
                console.log(`📊 Found ${expiredBattles.length} expired battle(s)`);
                for (const battle of expiredBattles) {
                    console.log(`⏰ Completing expired battle: "${battle.title}" (${battle.id})`);
                    await this.handleBattleCompletion(battle.id);
                }
                console.log('✅ All expired battles processed');
            }
            console.log('🕐 Checking if new battle needs to be created...');
            await this.checkAndCreateBattle();
        }
        catch (error) {
            console.error('❌ Error checking for expired battles:', error);
            throw error;
        }
    }
    async checkAndCompleteExpiredBattle() {
        try {
            const currentBattle = await this.db.getCurrentBattle();
            if (currentBattle && currentBattle.status === 'ACTIVE') {
                const now = new Date();
                if (now > currentBattle.endTime) {
                    console.log(`⏰ Battle "${currentBattle.title}" has expired, completing it now`);
                    await this.handleBattleCompletion(currentBattle.id);
                }
            }
        }
        catch (error) {
            console.error('Error checking for expired battle:', error);
        }
    }
    async checkAndCreateBattle() {
        try {
            const currentBattle = await this.db.getCurrentBattle();
            if (!currentBattle) {
                console.log('No active battle found, attempting to create new one...');
                try {
                    await this.createNewBattle();
                    console.log(`✅ Initial battle created successfully`);
                }
                catch (error) {
                    console.log('❌ Could not create new battle, will retry on next API call:', error);
                }
            }
            else {
                const now = new Date();
                if (now > currentBattle.endTime && currentBattle.status === 'ACTIVE') {
                    console.log(`Current battle "${currentBattle.title}" has expired, completing it and creating new one...`);
                    console.log(`🔄 Starting battle completion process for ${currentBattle.id}`);
                    await this.completeBattleWithJudging(currentBattle.id);
                    console.log(`✅ Battle completion process finished for ${currentBattle.id}`);
                    try {
                        console.log(`🔄 Creating new battle after completing ${currentBattle.id}`);
                        await this.createNewBattle();
                        console.log(`✅ New battle created successfully`);
                    }
                    catch (error) {
                        console.log('❌ Could not create new battle after completing expired one, will retry on next API call:', error);
                    }
                }
                else {
                    console.log(`Current battle: ${currentBattle.title} (${currentBattle.status}) - ends at ${currentBattle.endTime.toISOString()}`);
                }
            }
        }
        catch (error) {
            console.error('Error checking battle status:', error);
        }
    }
    async checkForDurationChange() {
        try {
            const currentBattle = await this.db.getCurrentBattle();
            if (!currentBattle || currentBattle.status !== 'ACTIVE') {
                return;
            }
            const storedDurationHours = currentBattle.durationHours;
            const currentConfigHours = this.config.battleDurationHours;
            const toleranceHours = 0.01;
            const durationDifference = Math.abs(storedDurationHours - currentConfigHours);
            if (durationDifference > toleranceHours) {
                console.log(`🔄 Battle duration configuration changed!`);
                console.log(`   Stored battle duration: ${storedDurationHours}h`);
                console.log(`   New configuration: ${currentConfigHours}h`);
                console.log(`   Completing current battle "${currentBattle.title}" and will create new one with correct duration...`);
                await this.db.completeBattle(currentBattle.id, []);
                console.log(`✅ Battle "${currentBattle.title}" completed due to duration configuration change`);
            }
            else {
                console.log(`✅ Current battle duration matches configuration (${currentConfigHours}h)`);
            }
        }
        catch (error) {
            console.error('Error checking for duration changes:', error);
        }
    }
    async createNewBattle() {
        try {
            console.log('Creating new automatic battle...');
            const NewsService = (await Promise.resolve().then(() => __importStar(require('./news-service')))).default;
            const topic = await NewsService.getDailyBattleTopic();
            if (!topic) {
                throw new Error('Failed to generate battle topic');
            }
            const actualStartTime = new Date();
            const endTime = new Date(actualStartTime.getTime() + (this.config.battleDurationHours * 60 * 60 * 1000));
            let debateId;
            if (this.onChainDebateService && this.onChainDebateService.isReady()) {
                try {
                    console.log('🔗 Creating on-chain debate...');
                    debateId = await this.onChainDebateService.createDebate(topic.title, "1", this.config.maxParticipants, this.config.battleDurationHours);
                    console.log(`✅ On-chain debate created with ID: ${debateId}`);
                }
                catch (error) {
                    console.error('❌ Failed to create on-chain debate:', error);
                    console.log('⚠️  Creating battle without on-chain integration');
                }
            }
            else {
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
                overallScore: 0,
                balanceScore: 0,
                complexity: 'medium',
                controversyLevel: 'medium',
                debateId: debateId,
            });
            console.log(`New battle created: ${battle.id}`);
            console.log(`Battle topic: ${battle.title}`);
            console.log(`Battle ends at: ${battle.endTime.toISOString()}`);
            if (debateId) {
                console.log(`🔗 Linked to on-chain debate ID: ${debateId}`);
            }
            console.log(`Automatic battle generation scheduled every ${this.config.battleDurationHours} hours`);
        }
        catch (error) {
            console.error('❌ Failed to create new battle:', error.message);
            if (error.message.includes('429') ||
                error.message.includes('rate limit') ||
                error.message.includes('Failed to generate battle topic after')) {
                console.log('🚫 Rate limit detected, will retry on next check');
            }
            else {
                console.log('🔄 Will retry battle generation on next interval');
            }
        }
    }
    async handleBattleCompletion(battleId) {
        try {
            console.log(`🏁 Starting complete battle flow for battle ${battleId}`);
            const completionResult = await this.completeBattleWithJudging(battleId);
            if (completionResult.success) {
                console.log(`✅ Winner selection completed successfully for battle ${battleId}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log(`🔄 Creating new battle after completing ${battleId}`);
                await this.createNewBattle();
                console.log(`✅ Complete battle flow finished for ${battleId}`);
            }
            else {
                console.log(`⚠️ Winner selection failed for battle ${battleId}, will retry on next API call`);
            }
        }
        catch (error) {
            console.error(`❌ Error in complete battle flow for ${battleId}:`, error);
        }
    }
    async completeBattleWithJudging(battleId) {
        try {
            console.log(`🏆 Starting AI-powered battle completion for battle ${battleId}`);
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
                return { success: true };
            }
            console.log(`📊 Found ${casts.length} casts for battle ${battleId}`);
            const AgentOrchestrator = (await Promise.resolve().then(() => __importStar(require('../agents/agent-orchestrator')))).default;
            const orchestrator = new AgentOrchestrator(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
            const result = await orchestrator.completeBattle(battle, casts, 'hybrid');
            if (result && result.judgment && result.judgment.winner) {
                const winner = result.judgment.winner;
                const winners = [{
                        userId: winner.userId,
                        position: 1,
                        prize: 'Winner of the battle'
                    }];
                if (result.judgment.insights) {
                    try {
                        await this.db.updateBattleInsights(battleId, result.judgment.insights);
                        console.log(`💡 Insights stored for battle ${battleId}`);
                    }
                    catch (error) {
                        console.error(`❌ Failed to store insights for battle ${battleId}:`, error);
                    }
                }
                await this.db.completeBattle(battleId, winners);
                if (this.oracle) {
                    try {
                        console.log(`🔗 Processing on-chain payout for battle ${battleId}`);
                        await this.oracle.processBattleCompletion(battleId);
                        console.log(`✅ On-chain payout processed successfully`);
                    }
                    catch (error) {
                        console.error(`❌ Failed to process on-chain payout:`, error);
                    }
                }
                else {
                    console.log(`⚠️  Oracle not available, skipping on-chain payout`);
                }
                try {
                    const winnerUser = await this.db.getUserById(winner.userId);
                    if (winnerUser) {
                        const newPoints = await this.db.awardParticipationPoints(winnerUser.address, 100);
                        console.log(`🎉 Winner ${winnerUser.address} awarded 100 points! Total points: ${newPoints}`);
                    }
                }
                catch (error) {
                    console.error(`❌ Failed to award winner points:`, error);
                }
                console.log(`✅ Battle ${battleId} completed successfully`);
                console.log(`🏆 Winner: ${winner.userId} (${winner.selectionMethod})`);
                console.log(`📈 Winning side: ${winner.groupAnalysis?.winningSide || 'Unknown'}`);
                console.log(`💡 Insights generated: ${result.judgment.insights ? 'Yes' : 'No'}`);
                return { success: true, winner: winner };
            }
            else {
                console.log(`⚠️ AI judging failed for battle ${battleId}, completing without winners`);
                await this.db.completeBattle(battleId, []);
                return { success: true };
            }
        }
        catch (error) {
            console.error(`❌ Error completing battle ${battleId} with AI judging:`, error);
            try {
                await this.db.completeBattle(battleId, []);
                console.log(`⚠️ Battle ${battleId} completed without winners due to error`);
                return { success: true };
            }
            catch (fallbackError) {
                console.error(`❌ Failed to complete battle ${battleId} even with fallback:`, fallbackError);
                return { success: false, error: fallbackError.message };
            }
        }
    }
    async getCurrentBattle() {
        return await this.db.getCurrentBattle();
    }
    async getBattleHistory(limit = 10) {
        return await this.db.getBattleHistory(limit);
    }
    async triggerBattleGeneration() {
        console.log('Manually triggering battle generation...');
        await this.checkAndCreateBattle();
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
    async getStats() {
        return await this.db.getBattleStats();
    }
}
exports.BattleManagerDB = BattleManagerDB;
