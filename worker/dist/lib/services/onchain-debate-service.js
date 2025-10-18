"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainDebateService = void 0;
exports.createOnChainDebateService = createOnChainDebateService;
const ethers_1 = require("ethers");
class OnChainDebateService {
    constructor() {
        const DEBATE_POOL_CONTRACT_ADDRESS = process.env.DEBATE_POOL_CONTRACT_ADDRESS || '0x3980d9dBd39447AE1cA8F2Dc453F4E00Eb452c46';
        const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
        const RPC_URL = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
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
                "function getUserDebates(address user) external view returns (uint256[])",
                "function getUserPoints(address user) external view returns (uint256)",
                "function isParticipant(uint256 debateId, address user) external view returns (bool)",
                "function declareWinner(tuple(uint256 debateId, address winner, uint256 timestamp, bytes signature) result) external",
                "event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime)",
                "event ParticipantJoined(uint256 indexed debateId, address participant)",
                "event WinnerDeclared(uint256 indexed debateId, address winner, uint256 prizeAmount)",
                "event PointsAwarded(address indexed user, uint256 points, string reason)"
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
            const durationSeconds = Math.floor(durationHours * 3600);
            const tx = await this.contract.createDebate(topic, entryFeeWei, maxParticipants, durationSeconds);
            console.log(`⏳ Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`);
            let debateId = 0;
            console.log(`🔍 Parsing ${receipt?.logs?.length || 0} transaction logs...`);
            for (const log of receipt?.logs || []) {
                console.log(`🔍 Log: ${log.address} topics: ${log.topics?.length || 0}`);
                let parsed = null;
                try {
                    parsed = this.contract.interface.parseLog(log);
                    console.log(`🔍 Parsed log: ${parsed?.name}, args:`, parsed?.args);
                    if (parsed?.name === "DebateCreated") {
                        debateId = Number(parsed.args.debateId);
                        console.log(`✅ Found DebateCreated event with ID: ${debateId}`);
                        break;
                    }
                }
                catch (error) {
                    console.log(`⚠️ Could not parse log with contract interface:`, error.message);
                }
                if (debateId === 0 && log.topics && log.topics.length >= 2) {
                    const debateIdHex = log.topics[1];
                    debateId = parseInt(debateIdHex, 16);
                    console.log(`✅ Extracted debate ID from topic: ${debateId} (from ${debateIdHex})`);
                    break;
                }
            }
            if (debateId === 0) {
                console.log(`❌ No DebateCreated event found in transaction logs`);
                console.log(`📋 Available logs:`, receipt?.logs?.map(log => ({
                    address: log.address,
                    topics: log.topics,
                    data: log.data
                })));
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
