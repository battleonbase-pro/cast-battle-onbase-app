"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainDebateService = void 0;
exports.createOnChainDebateService = createOnChainDebateService;
const ethers_1 = require("ethers");
const DEBATE_POOL_CONTRACT_ADDRESS = process.env.DEBATE_POOL_CONTRACT_ADDRESS || '0xD204b546020765994e8B9da58F76D9E85764a059';
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
const RPC_URL = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
class OnChainDebateService {
    constructor() {
        if (!ORACLE_PRIVATE_KEY || !DEBATE_POOL_CONTRACT_ADDRESS) {
            throw new Error('Oracle private key or contract address not configured');
        }
        try {
            this.provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL, {
                chainId: 84532,
                name: "base-sepolia"
            });
            this.wallet = new ethers_1.ethers.Wallet(ORACLE_PRIVATE_KEY, this.provider);
            const contractABI = [
                "function createDebate(string memory topic, uint256 entryFee, uint256 maxParticipants, uint256 durationSeconds) external returns (uint256)",
                "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))",
                "function getActiveDebates() external view returns (uint256[])",
                "event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime)"
            ];
            this.contract = new ethers_1.ethers.Contract(DEBATE_POOL_CONTRACT_ADDRESS, contractABI, this.wallet);
            console.log(`🔗 OnChainDebateService initialized for contract: ${DEBATE_POOL_CONTRACT_ADDRESS}`);
            console.log(`🔗 Oracle address: ${this.wallet.address}`);
            console.log(`🔗 ENS disabled for Base Sepolia (not supported)`);
        }
        catch (error) {
            console.error(`⚠️ OnChainDebateService initialization failed:`, error);
            throw error;
        }
    }
    async createDebate(topic, entryFee = "1", maxParticipants = 100, durationHours = 4) {
        try {
            console.log(`📝 Creating on-chain debate: "${topic}"`);
            console.log(`   Entry Fee: ${entryFee} USDC`);
            console.log(`   Max Participants: ${maxParticipants}`);
            console.log(`   Duration: ${durationHours} hours`);
            const entryFeeWei = ethers_1.ethers.parseUnits(entryFee, 6);
            const durationSeconds = durationHours * 3600;
            const tx = await this.contract.createDebate(topic, entryFeeWei, maxParticipants, durationSeconds);
            console.log(`⏳ Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`);
            let debateId = 0;
            for (const log of receipt?.logs || []) {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    if (parsed?.name === "DebateCreated") {
                        debateId = Number(parsed.args.debateId);
                        break;
                    }
                }
                catch {
                }
            }
            if (debateId === 0) {
                throw new Error('Failed to extract debate ID from transaction');
            }
            console.log(`🎉 On-chain debate created with ID: ${debateId}`);
            console.log(`🔗 Transaction hash: ${tx.hash}`);
            console.log(`⛽ Gas used: ${receipt?.gasUsed.toString()}`);
            return debateId;
        }
        catch (error) {
            console.error(`❌ Failed to create on-chain debate:`, error);
            throw error;
        }
    }
    async getDebate(debateId) {
        try {
            const debate = await this.contract.getDebate(debateId);
            return {
                id: Number(debate.id),
                topic: debate.topic,
                entryFee: ethers_1.ethers.formatUnits(debate.entryFee, 6),
                maxParticipants: Number(debate.maxParticipants),
                startTime: new Date(Number(debate.startTime) * 1000),
                endTime: new Date(Number(debate.endTime) * 1000),
                participants: debate.participants,
                winner: debate.winner,
                isActive: debate.isActive,
                isCompleted: debate.isCompleted
            };
        }
        catch (error) {
            console.error(`❌ Failed to get debate ${debateId}:`, error);
            throw error;
        }
    }
    async getActiveDebates() {
        try {
            const activeDebates = await this.contract.getActiveDebates();
            return activeDebates.map(id => Number(id));
        }
        catch (error) {
            console.error(`❌ Failed to get active debates:`, error);
            throw error;
        }
    }
    isReady() {
        return !!(this.provider && this.wallet && this.contract);
    }
    getOracleAddress() {
        return this.wallet.address;
    }
}
exports.OnChainDebateService = OnChainDebateService;
function createOnChainDebateService() {
    return new OnChainDebateService();
}
