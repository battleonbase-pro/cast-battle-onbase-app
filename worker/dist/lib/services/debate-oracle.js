"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebateOracle = void 0;
exports.createDebateOracle = createDebateOracle;
const ethers_1 = require("ethers");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DebateOracle {
    constructor(rpcUrl, privateKey, contractAddress, contractABI) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl, {
            chainId: 84532,
            name: "base-sepolia"
        });
        this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.contractAddress = contractAddress;
        this.contract = new ethers_1.ethers.Contract(contractAddress, contractABI, this.wallet);
    }
    async signWinnerResult(debateId, winnerAddress) {
        const domain = {
            name: 'DebatePool',
            version: '1',
            chainId: 84532,
            verifyingContract: this.contractAddress
        };
        const types = {
            WinnerResult: [
                { name: 'debateId', type: 'uint256' },
                { name: 'winner', type: 'address' },
                { name: 'timestamp', type: 'uint256' }
            ]
        };
        const value = {
            debateId: debateId,
            winner: winnerAddress,
            timestamp: Math.floor(Date.now() / 1000)
        };
        const signature = await this.wallet.signTypedData(domain, types, value);
        return signature;
    }
    async declareWinner(debateId, winnerAddress) {
        try {
            console.log(`🏆 Declaring winner for debate ${debateId}: ${winnerAddress}`);
            const signature = await this.signWinnerResult(debateId, winnerAddress);
            const result = {
                debateId: debateId,
                winner: winnerAddress,
                timestamp: Math.floor(Date.now() / 1000),
                signature: signature
            };
            const tx = await this.contract.declareWinner(result);
            const receipt = await tx.wait();
            console.log(`✅ Winner declared successfully!`);
            console.log(`   Transaction Hash: ${receipt.hash}`);
            console.log(`   Gas Used: ${receipt.gasUsed}`);
            return receipt.hash;
        }
        catch (error) {
            console.error(`❌ Failed to declare winner:`, error);
            throw error;
        }
    }
    async processBattleCompletion(battleId) {
        try {
            console.log(`🔄 Processing battle completion for battle ${battleId}`);
            const battle = await prisma.battle.findUnique({
                where: { id: battleId },
                include: {
                    participants: true
                }
            });
            if (!battle) {
                throw new Error(`Battle ${battleId} not found`);
            }
            if (battle.status !== 'COMPLETED') {
                throw new Error(`Battle ${battleId} is not completed`);
            }
            if (!battle.debateId) {
                throw new Error(`Battle ${battleId} is not linked to an on-chain debate`);
            }
            const winnerParticipant = battle.participants[0];
            if (!winnerParticipant) {
                console.log(`⚠️ No participants found for battle ${battleId}, skipping on-chain processing`);
                return;
            }
            const winnerUser = await prisma.user.findUnique({
                where: { id: winnerParticipant.userId }
            });
            if (!winnerUser?.address) {
                throw new Error(`Winner user address not found`);
            }
            console.log(`🎯 Winner identified: ${winnerUser.address}`);
            console.log(`🔗 Using debate ID: ${battle.debateId}`);
            const txHash = await this.declareWinner(battle.debateId, winnerUser.address);
            await prisma.battle.update({
                where: { id: battleId },
                data: {}
            });
            console.log(`✅ Battle ${battleId} processed successfully`);
        }
        catch (error) {
            console.error(`❌ Failed to process battle ${battleId}:`, error);
            throw error;
        }
    }
    async getContractBalance() {
        try {
            const balance = await this.contract.getContractBalance();
            return ethers_1.ethers.formatUnits(balance, 6);
        }
        catch (error) {
            console.error('Failed to get contract balance:', error);
            throw error;
        }
    }
    async getActiveDebates() {
        try {
            const activeDebates = await this.contract.getActiveDebates();
            return activeDebates.map((id) => Number(id));
        }
        catch (error) {
            console.error('Failed to get active debates:', error);
            throw error;
        }
    }
    async getDebateDetails(debateId) {
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
            console.error(`Failed to get debate ${debateId}:`, error);
            throw error;
        }
    }
}
exports.DebateOracle = DebateOracle;
function createDebateOracle() {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    const privateKey = process.env.ORACLE_PRIVATE_KEY;
    const contractAddress = process.env.DEBATE_POOL_CONTRACT_ADDRESS;
    if (!privateKey) {
        throw new Error('ORACLE_PRIVATE_KEY environment variable is required');
    }
    if (!contractAddress) {
        throw new Error('DEBATE_POOL_CONTRACT_ADDRESS environment variable is required');
    }
    const contractABI = [
        "function declareWinner(tuple(uint256 debateId, address winner, uint256 timestamp, bytes signature) result) external",
        "function getContractBalance() external view returns (uint256)",
        "function getActiveDebates() external view returns (uint256[])",
        "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))"
    ];
    return new DebateOracle(rpcUrl, privateKey, contractAddress, contractABI);
}
