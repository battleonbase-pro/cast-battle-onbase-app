import { ethers } from 'ethers';

/**
 * Contract addresses for Base Sepolia
 */
export const CONTRACT_ADDRESSES = {
  BASE_SEPOLIA: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    DEBATE_POOL: process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || '', // Will be set after deployment
  },
  BASE_MAINNET: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DEBATE_POOL: '', // Will be set when deployed to mainnet
  }
};

/**
 * Contract ABI for frontend interactions
 */
export const DEBATE_POOL_ABI = [
  // View functions
  "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))",
  "function getActiveDebates() external view returns (uint256[])",
  "function getUserDebates(address user) external view returns (uint256[])",
  "function getContractBalance() external view returns (uint256)",
  
  // Write functions
  "function joinDebate(uint256 debateId) external",
  
  // Events
  "event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee)",
  "event ParticipantJoined(uint256 indexed debateId, address indexed participant)",
  "event WinnerDeclared(uint256 indexed debateId, address indexed winner, uint256 prize)",
  "event FundsWithdrawn(address indexed to, uint256 amount)"
];

/**
 * USDC ABI for token interactions
 */
export const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

/**
 * Debate contract service for frontend
 */
export class DebateContractService {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner | null = null;
  private debatePoolContract: ethers.Contract | null = null;
  private usdcContract: ethers.Contract | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      throw new Error('Ethereum provider not found');
    }
  }

  /**
   * Connect to wallet and initialize contracts
   */
  async connect(): Promise<string> {
    try {
      // Request account access
      await this.provider.send('eth_requestAccounts', []);
      
      // Get signer
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      // Initialize contracts
      const chainId = await this.provider.getNetwork().then(n => n.chainId);
      const contractAddresses = this.getContractAddresses(chainId);
      
      if (contractAddresses.DEBATE_POOL) {
        this.debatePoolContract = new ethers.Contract(
          contractAddresses.DEBATE_POOL,
          DEBATE_POOL_ABI,
          this.signer
        );
      }

      this.usdcContract = new ethers.Contract(
        contractAddresses.USDC,
        USDC_ABI,
        this.signer
      );

      console.log('🔗 Connected to wallet:', address);
      console.log('📋 Contracts initialized for chain:', chainId);
      
      return address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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
   */
  async checkUSDCBalance(requiredAmount: string): Promise<{ hasBalance: boolean; balance: string; required: string }> {
    if (!this.signer || !this.usdcContract) {
      throw new Error('Wallet not connected');
    }

    const address = await this.signer.getAddress();
    const balance = await this.usdcContract.balanceOf(address);
    const balanceFormatted = ethers.formatUnits(balance, 6);
    const requiredFormatted = ethers.formatUnits(ethers.parseUnits(requiredAmount, 6), 6);

    return {
      hasBalance: balance >= ethers.parseUnits(requiredAmount, 6),
      balance: balanceFormatted,
      required: requiredFormatted
    };
  }

  /**
   * Approve USDC spending for debate pool
   */
  async approveUSDC(amount: string): Promise<string> {
    if (!this.debatePoolContract || !this.usdcContract) {
      throw new Error('Contracts not initialized');
    }

    const amountWei = ethers.parseUnits(amount, 6);
    const contractAddress = await this.debatePoolContract.getAddress();
    
    const tx = await this.usdcContract.approve(contractAddress, amountWei);
    const receipt = await tx.wait();
    
    console.log('✅ USDC approved:', receipt.hash);
    return receipt.hash;
  }

  /**
   * Join a debate by paying USDC entry fee
   */
  async joinDebate(debateId: number): Promise<string> {
    if (!this.debatePoolContract) {
      throw new Error('Debate pool contract not initialized');
    }

    try {
      console.log(`🎯 Joining debate ${debateId}...`);
      
      const tx = await this.debatePoolContract.joinDebate(debateId);
      const receipt = await tx.wait();
      
      console.log('✅ Joined debate successfully:', receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error('Failed to join debate:', error);
      throw error;
    }
  }

  /**
   * Get debate details
   */
  async getDebate(debateId: number): Promise<any> {
    if (!this.debatePoolContract) {
      throw new Error('Debate pool contract not initialized');
    }

    try {
      const debate = await this.debatePoolContract.getDebate(debateId);
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
      console.error('Failed to get debate:', error);
      throw error;
    }
  }

  /**
   * Get active debates
   */
  async getActiveDebates(): Promise<number[]> {
    if (!this.debatePoolContract) {
      throw new Error('Debate pool contract not initialized');
    }

    try {
      const activeDebates = await this.debatePoolContract.getActiveDebates();
      return activeDebates.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Failed to get active debates:', error);
      throw error;
    }
  }

  /**
   * Get user's debate history
   */
  async getUserDebates(): Promise<number[]> {
    if (!this.debatePoolContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const address = await this.signer.getAddress();
      const userDebates = await this.debatePoolContract.getUserDebates(address);
      return userDebates.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Failed to get user debates:', error);
      throw error;
    }
  }

  /**
   * Get contract balance
   */
  async getContractBalance(): Promise<string> {
    if (!this.debatePoolContract) {
      throw new Error('Debate pool contract not initialized');
    }

    try {
      const balance = await this.debatePoolContract.getContractBalance();
      return ethers.formatUnits(balance, 6);
    } catch (error) {
      console.error('Failed to get contract balance:', error);
      throw error;
    }
  }

  /**
   * Check if user is participant in debate
   */
  async isParticipant(debateId: number): Promise<boolean> {
    if (!this.signer) {
      return false;
    }

    try {
      const debate = await this.getDebate(debateId);
      const address = await this.signer.getAddress();
      return debate.participants.includes(address);
    } catch (error) {
      console.error('Failed to check participation:', error);
      return false;
    }
  }

  /**
   * Get current chain ID
   */
  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  /**
   * Switch to Base Sepolia network
   */
  async switchToBaseSepolia(): Promise<void> {
    try {
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: '0x14a34' } // Base Sepolia chain ID
      ]);
    } catch (error: any) {
      // If chain doesn't exist, add it
      if (error.code === 4902) {
        await this.provider.send('wallet_addEthereumChain', [
          {
            chainId: '0x14a34',
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          },
        ]);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Create a singleton instance
 */
let contractService: DebateContractService | null = null;

export function getContractService(): DebateContractService {
  if (!contractService) {
    contractService = new DebateContractService();
  }
  return contractService;
}
