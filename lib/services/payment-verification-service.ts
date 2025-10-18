import { ethers } from 'ethers';

/**
 * Contract addresses for Base Sepolia
 */
export const CONTRACT_ADDRESSES = {
  BASE_SEPOLIA: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    DEBATE_POOL: process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || '',
  },
  BASE_MAINNET: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DEBATE_POOL: '', // Will be set when deployed to mainnet
  }
};

/**
 * Contract ABI for verification
 */
export const DEBATE_POOL_ABI = [
  "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))",
  "function getActiveDebates() external view returns (uint256[])",
  "function getUserDebates(address user) external view returns (uint256[])",
  "function getContractBalance() external view returns (uint256)",
];

export const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

/**
 * Payment Verification Service
 * Verifies payments on-chain and manages debate participation
 */
export class PaymentVerificationService {
  private provider: ethers.JsonRpcProvider | null = null;
  private debatePoolContract: ethers.Contract | null = null;
  private usdcContract: ethers.Contract | null = null;

  constructor() {
    // Use server-side RPC provider instead of browser provider
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Initialize contracts
   */
  async initialize(): Promise<void> {
    if (!this.provider) {
      throw new Error('RPC provider not available');
    }

    try {
      const chainId = await this.provider.getNetwork().then(n => n.chainId);
      const contractAddresses = this.getContractAddresses(chainId);
      
      if (!contractAddresses.DEBATE_POOL) {
        throw new Error('Debate pool contract not configured for this network');
      }

      // Initialize contracts
      this.debatePoolContract = new ethers.Contract(
        contractAddresses.DEBATE_POOL,
        DEBATE_POOL_ABI,
        this.provider
      );

      this.usdcContract = new ethers.Contract(
        contractAddresses.USDC,
        USDC_ABI,
        this.provider
      );

      console.log('✅ Payment verification service initialized');
      console.log(`   Network: ${chainId}`);
      console.log(`   Debate Pool: ${contractAddresses.DEBATE_POOL}`);
      console.log(`   USDC: ${contractAddresses.USDC}`);
    } catch (error) {
      console.error('❌ Failed to initialize payment verification:', error);
      throw error;
    }
  }

  /**
   * Get contract addresses for current chain
   */
  private getContractAddresses(chainId: bigint) {
    switch (Number(chainId)) {
      case 84532: // Base Sepolia
        return CONTRACT_ADDRESSES.BASE_SEPOLIA;
      case 8453: // Base Mainnet
        return CONTRACT_ADDRESSES.BASE_MAINNET;
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  /**
   * Check if user has sufficient USDC balance
   * @param userAddress User's wallet address
   * @param amount Amount in USDC (e.g., "1.00")
   */
  async checkUSDCBalance(userAddress: string, amount: string = "1.00"): Promise<boolean> {
    if (!this.usdcContract) {
      throw new Error('USDC contract not initialized');
    }

    try {
      const balance = await this.usdcContract.balanceOf(userAddress);
      const requiredAmount = ethers.parseUnits(amount, 6); // USDC has 6 decimals
      
      return balance >= requiredAmount;
    } catch (error) {
      console.error('❌ Failed to check USDC balance:', error);
      return false;
    }
  }

  /**
   * Get user's USDC balance
   * @param userAddress User's wallet address
   */
  async getUSDCBalance(userAddress: string): Promise<string> {
    if (!this.usdcContract) {
      throw new Error('USDC contract not initialized');
    }

    try {
      const balance = await this.usdcContract.balanceOf(userAddress);
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('❌ Failed to get USDC balance:', error);
      return "0";
    }
  }

  /**
   * Check if user is already a participant in a debate
   * @param debateId Debate ID
   * @param userAddress User's wallet address
   */
  async isParticipant(debateId: number, userAddress: string): Promise<boolean> {
    if (!this.debatePoolContract) {
      throw new Error('Debate pool contract not initialized');
    }

    try {
      const debate = await this.debatePoolContract.getDebate(debateId);
      return debate.participants.includes(userAddress);
    } catch (error) {
      console.error('❌ Failed to check participation:', error);
      return false;
    }
  }

  /**
   * Get debate details
   * @param debateId Debate ID
   */
  async getDebateDetails(debateId: number) {
    if (!this.debatePoolContract) {
      throw new Error('Debate pool contract not initialized');
    }

    try {
      const debate = await this.debatePoolContract.getDebate(debateId);
      return {
        id: Number(debate.id),
        topic: debate.topic,
        entryFee: ethers.formatUnits(debate.entryFee, 6), // Convert to USDC
        maxParticipants: Number(debate.maxParticipants),
        participants: debate.participants,
        isActive: debate.isActive,
        isCompleted: debate.isCompleted
      };
    } catch (error) {
      console.error('❌ Failed to get debate details:', error);
      throw error;
    }
  }

  /**
   * Verify payment by checking if user became a participant
   * @param debateId Debate ID
   * @param userAddress User's wallet address
   */
  async verifyPayment(debateId: number, userAddress: string): Promise<boolean> {
    try {
      const isParticipant = await this.isParticipant(debateId, userAddress);
      console.log(`🔍 Payment verification for debate ${debateId}: ${isParticipant ? '✅ Verified' : '❌ Not verified'}`);
      return isParticipant;
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const paymentVerificationService = new PaymentVerificationService();
