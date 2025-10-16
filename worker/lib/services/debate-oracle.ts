import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Oracle service for signing winner results and triggering contract payouts
 */
export class DebateOracle {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor(
    rpcUrl: string,
    privateKey: string,
    contractAddress: string,
    contractABI: any[]
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
  }

  /**
   * Sign a winner result using EIP-712
   */
  async signWinnerResult(debateId: number, winnerAddress: string): Promise<string> {
    const domain = {
      name: 'DebatePool',
      version: '1',
      chainId: 84532, // Base Sepolia
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

  /**
   * Declare winner on the smart contract
   */
  async declareWinner(debateId: number, winnerAddress: string): Promise<string> {
    try {
      console.log(`🏆 Declaring winner for debate ${debateId}: ${winnerAddress}`);

      // Sign the winner result
      const signature = await this.signWinnerResult(debateId, winnerAddress);

      // Prepare the result object
      const result = {
        debateId: debateId,
        winner: winnerAddress,
        timestamp: Math.floor(Date.now() / 1000),
        signature: signature
      };

      // Call the smart contract
      const tx = await this.contract.declareWinner(result);
      const receipt = await tx.wait();

      console.log(`✅ Winner declared successfully!`);
      console.log(`   Transaction Hash: ${receipt.hash}`);
      console.log(`   Gas Used: ${receipt.gasUsed}`);

      return receipt.hash;
    } catch (error) {
      console.error(`❌ Failed to declare winner:`, error);
      throw error;
    }
  }

  /**
   * Process battle completion and declare winner
   */
  async processBattleCompletion(battleId: string): Promise<void> {
    try {
      console.log(`🔄 Processing battle completion for battle ${battleId}`);

      // Get battle details from database
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        include: {
          participants: true,
          votes: true
        }
      });

      if (!battle) {
        throw new Error(`Battle ${battleId} not found`);
      }

      if (battle.status !== 'COMPLETED') {
        throw new Error(`Battle ${battleId} is not completed`);
      }

      // Find the winner (participant with most votes)
      const voteCounts = battle.votes.reduce((acc, vote) => {
        acc[vote.participantId] = (acc[vote.participantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const winnerParticipantId = Object.keys(voteCounts).reduce((a, b) => 
        voteCounts[a] > voteCounts[b] ? a : b
      );

      const winnerParticipant = battle.participants.find(p => p.id === winnerParticipantId);
      if (!winnerParticipant) {
        throw new Error(`Winner participant not found`);
      }

      // Get winner's wallet address
      const winnerUser = await prisma.user.findUnique({
        where: { id: winnerParticipant.userId }
      });

      if (!winnerUser?.address) {
        throw new Error(`Winner user address not found`);
      }

      console.log(`🎯 Winner identified: ${winnerUser.address} (${voteCounts[winnerParticipantId]} votes)`);

      // Declare winner on smart contract
      const txHash = await this.declareWinner(parseInt(battleId), winnerUser.address);

      // Update battle with transaction hash
      await prisma.battle.update({
        where: { id: battleId },
        data: {
          // Add a field to store the transaction hash if needed
          // transactionHash: txHash
        }
      });

      console.log(`✅ Battle ${battleId} processed successfully`);
    } catch (error) {
      console.error(`❌ Failed to process battle ${battleId}:`, error);
      throw error;
    }
  }

  /**
   * Get contract balance
   */
  async getContractBalance(): Promise<string> {
    try {
      const balance = await this.contract.getContractBalance();
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('Failed to get contract balance:', error);
      throw error;
    }
  }

  /**
   * Get active debates from contract
   */
  async getActiveDebates(): Promise<number[]> {
    try {
      const activeDebates = await this.contract.getActiveDebates();
      return activeDebates.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Failed to get active debates:', error);
      throw error;
    }
  }

  /**
   * Get debate details from contract
   */
  async getDebateDetails(debateId: number): Promise<any> {
    try {
      const debate = await this.contract.getDebate(debateId);
      return {
        id: Number(debate.id),
        topic: debate.topic,
        entryFee: ethers.formatUnits(debate.entryFee, 6),
        maxParticipants: Number(debate.maxParticipants),
        startTime: new Date(Number(debate.startTime) * 1000),
        endTime: new Date(Number(debate.endTime) * 1000),
        participants: debate.participants,
        winner: debate.winner,
        isActive: debate.isActive,
        isCompleted: debate.isCompleted
      };
    } catch (error) {
      console.error(`Failed to get debate ${debateId}:`, error);
      throw error;
    }
  }
}

/**
 * Initialize the oracle service
 */
export function createDebateOracle(): DebateOracle {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  const contractAddress = process.env.DEBATE_POOL_CONTRACT_ADDRESS;

  if (!privateKey) {
    throw new Error('ORACLE_PRIVATE_KEY environment variable is required');
  }

  if (!contractAddress) {
    throw new Error('DEBATE_POOL_CONTRACT_ADDRESS environment variable is required');
  }

  // Contract ABI (minimal for oracle operations)
  const contractABI = [
    "function declareWinner(tuple(uint256 debateId, address winner, uint256 timestamp, bytes signature) result) external",
    "function getContractBalance() external view returns (uint256)",
    "function getActiveDebates() external view returns (uint256[])",
    "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))"
  ];

  return new DebateOracle(rpcUrl, privateKey, contractAddress, contractABI);
}
