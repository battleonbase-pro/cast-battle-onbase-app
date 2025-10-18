import { ethers } from 'ethers';

/**
 * Service to handle debate participation after Base Pay success
 * This service provides the contract interaction logic for the frontend
 */
export class DebateParticipationService {
  private contractAddress: string;
  private contractABI: any[];

  constructor() {
    this.contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || '';
    
    if (!this.contractAddress) {
      throw new Error('NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS not configured');
    }

    // Contract ABI for contract interaction
    this.contractABI = [
      "function joinDebate(uint256 debateId) external",
      "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))",
      "function getActiveDebates() external view returns (uint256[])",
      "function isParticipant(uint256 debateId, address participant) external view returns (bool)"
    ];
  }

  /**
   * Get contract instance connected to user's wallet
   * @param signer User's wallet signer
   * @returns Contract instance
   */
  private getContract(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(this.contractAddress, this.contractABI, signer);
  }

  /**
   * Check if a user is already a participant in a debate
   * @param debateId The debate ID
   * @param userAddress The user's wallet address
   * @returns True if user is a participant
   */
  async isParticipant(debateId: number, userAddress: string): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org');
      const contract = new ethers.Contract(this.contractAddress, this.contractABI, provider);
      return await contract.isParticipant(debateId, userAddress);
    } catch (error) {
      console.error(`❌ Failed to check participation status:`, error);
      return false;
    }
  }

  /**
   * Get debate details
   * @param debateId The debate ID
   * @returns Debate details
   */
  async getDebateDetails(debateId: number): Promise<any> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org');
      const contract = new ethers.Contract(this.contractAddress, this.contractABI, provider);
      return await contract.getDebate(debateId);
    } catch (error) {
      console.error(`❌ Failed to get debate details:`, error);
      throw error;
    }
  }

  /**
   * Get all active debates
   * @returns Array of active debate IDs
   */
  async getActiveDebates(): Promise<number[]> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org');
      const contract = new ethers.Contract(this.contractAddress, this.contractABI, provider);
      return await contract.getActiveDebates();
    } catch (error) {
      console.error(`❌ Failed to get active debates:`, error);
      return [];
    }
  }

  /**
   * Analyze the current debate participation issue
   * @returns Analysis of the participation problem
   */
  async analyzeParticipationIssue(): Promise<{
    problem: string;
    solution: string;
    recommendation: string;
  }> {
    try {
      const activeDebates = await this.getActiveDebates();
      
      let totalParticipants = 0;
      for (const debateId of activeDebates) {
        const debate = await this.getDebateDetails(debateId);
        totalParticipants += debate.participants.length;
      }

      return {
        problem: `Current contract design has a conflict: Base Pay handles USDC payment, but joinDebate() also tries to transfer USDC. This creates a double payment scenario.`,
        solution: `Modify the contract to add a function that allows adding participants after Base Pay success, or modify joinDebate() to skip USDC transfer if payment already made.`,
        recommendation: `Since you don't want to modify the contract, the current approach of tracking participation in the database (not on-chain) is the best solution. The on-chain debates will remain empty, but the application logic handles participation correctly.`
      };
    } catch (error) {
      return {
        problem: 'Unable to analyze participation issue',
        solution: 'Check contract connection and configuration',
        recommendation: 'Ensure contract address and RPC URL are correctly configured'
      };
    }
  }
}

// Export singleton instance
export const debateParticipationService = new DebateParticipationService();