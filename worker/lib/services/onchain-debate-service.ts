import { ethers } from 'ethers';

export class OnChainDebateService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: any;

  constructor() {
    // Get environment variables inside constructor to ensure they're loaded
    const DEBATE_POOL_CONTRACT_ADDRESS_RAW = process.env.DEBATE_POOL_CONTRACT_ADDRESS || '0x3980d9dBd39447AE1cA8F2Dc453F4E00Eb452c46';
    const ORACLE_PRIVATE_KEY_RAW = process.env.ORACLE_PRIVATE_KEY || '';
    const RPC_URL = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

    // CRITICAL FIX: Trim whitespace/newlines from secret values
    // GCP Secret Manager often includes trailing newlines
    const ORACLE_PRIVATE_KEY = ORACLE_PRIVATE_KEY_RAW.trim();
    const DEBATE_POOL_CONTRACT_ADDRESS = DEBATE_POOL_CONTRACT_ADDRESS_RAW.trim();

    if (!ORACLE_PRIVATE_KEY || !DEBATE_POOL_CONTRACT_ADDRESS) {
      throw new Error('Oracle private key or contract address not configured');
    }

    // Validate private key format
    if (!ORACLE_PRIVATE_KEY.startsWith('0x') || ORACLE_PRIVATE_KEY.length !== 66) {
      throw new Error(`Invalid ORACLE_PRIVATE_KEY format. Expected 66-character hex string starting with 0x, got: ${ORACLE_PRIVATE_KEY.length} characters`);
    }

    try {
      // Create provider for Base Sepolia without ENS resolution
      this.provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Create wallet with provider, but catch ENS resolution errors
      try {
        this.wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, this.provider);
      } catch (error: any) {
        if (error.code === 'UNSUPPORTED_OPERATION' && error.operation === 'getEnsAddress') {
          // If ENS resolution fails, create wallet without provider and connect manually
          console.log(`🔗 ENS resolution failed, using fallback wallet creation`);
          this.wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY);
          this.wallet = this.wallet.connect(this.provider);
        } else {
          throw error;
        }
      }
      
      // Create contract directly with ABI for MinimalDebatePool
      // Note: MinimalDebatePool doesn't have createDebate() - debates are created in backend only
      const contractABI = [
        "function getContractBalance() external view returns (uint256)",
        "function isDebateCompleted(uint256 debateId) external view returns (bool)",
        "function getPlatformFees(uint256 debateId) external view returns (uint256)",
        "event WinnerDistributed(uint256 indexed debateId, address indexed winner, uint256 winnerPrize, uint256 platformFee)"
      ];
      
      this.contract = new ethers.Contract(DEBATE_POOL_CONTRACT_ADDRESS, contractABI, this.wallet);

      console.log(`🔗 OnChainDebateService initialized for contract: ${DEBATE_POOL_CONTRACT_ADDRESS}`);
      console.log(`🔗 Oracle address: ${this.wallet.address}`);
      console.log(`🔗 Base Sepolia provider configured without ENS resolution`);
    } catch (error) {
      console.error(`⚠️ OnChainDebateService initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Get contract USDC balance
   * @returns Contract balance in USDC (with 6 decimals)
   */
  async getContractBalance(): Promise<string> {
    try {
      const balance = await this.contract.getContractBalance();
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error(`❌ Failed to get contract balance:`, error);
      throw error;
    }
  }

  /**
   * Check if a debate is completed on-chain
   * @param debateId The debate ID
   * @returns True if debate is completed
   */
  async isDebateCompleted(debateId: number): Promise<boolean> {
    try {
      return await this.contract.isDebateCompleted(debateId);
    } catch (error) {
      console.error(`❌ Failed to check debate completion for ${debateId}:`, error);
      return false;
    }
  }

  /**
   * Check if the service is properly configured
   * @returns True if service is ready
   */
  isReady(): boolean {
    return !!(this.provider && this.wallet && this.contract);
  }

  /**
   * Get oracle address
   * @returns Oracle wallet address
   */
  getOracleAddress(): string {
    return this.wallet.address;
  }
}

export function createOnChainDebateService(): OnChainDebateService {
  return new OnChainDebateService();
}
