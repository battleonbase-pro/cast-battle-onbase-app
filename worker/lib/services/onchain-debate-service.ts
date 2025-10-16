import { ethers } from 'ethers';

// Configuration for Base Sepolia
const DEBATE_POOL_CONTRACT_ADDRESS = process.env.DEBATE_POOL_CONTRACT_ADDRESS || '0xD204b546020765994e8B9da58F76D9E85764a059';
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
const RPC_URL = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

export class OnChainDebateService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: any;

  constructor() {
    if (!ORACLE_PRIVATE_KEY || !DEBATE_POOL_CONTRACT_ADDRESS) {
      throw new Error('Oracle private key or contract address not configured');
    }

           try {
             // Standard approach for ethers.js v6 with networks that don't support ENS
             // Use minimal network configuration to avoid any ENS resolution attempts
             this.provider = new ethers.JsonRpcProvider(RPC_URL, {
               chainId: 84532,
               name: "base-sepolia"
             });
             
             this.wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, this.provider);
             
             // Create contract directly with ABI instead of using factory to avoid ENS resolution
             const contractABI = [
               "function createDebate(string memory topic, uint256 entryFee, uint256 maxParticipants, uint256 durationSeconds) external returns (uint256)",
               "function getDebate(uint256 debateId) external view returns (tuple(uint256 id, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime, address[] participants, address winner, bool isActive, bool isCompleted))",
               "function getActiveDebates() external view returns (uint256[])",
               "event DebateCreated(uint256 indexed debateId, string topic, uint256 entryFee, uint256 maxParticipants, uint256 startTime, uint256 endTime)"
             ];
             
             this.contract = new ethers.Contract(DEBATE_POOL_CONTRACT_ADDRESS, contractABI, this.wallet);

             console.log(`🔗 OnChainDebateService initialized for contract: ${DEBATE_POOL_CONTRACT_ADDRESS}`);
             console.log(`🔗 Oracle address: ${this.wallet.address}`);
             console.log(`🔗 ENS disabled for Base Sepolia (not supported)`);
           } catch (error) {
             console.error(`⚠️ OnChainDebateService initialization failed:`, error);
             throw error;
           }
  }

  /**
   * Create a new debate on-chain
   * @param topic Debate topic
   * @param entryFee Entry fee in USDC (e.g., "1" for 1 USDC)
   * @param maxParticipants Maximum number of participants
   * @param durationHours Duration in hours
   * @returns The debate ID
   */
  async createDebate(
    topic: string,
    entryFee: string = "1", // Default to 1 USDC
    maxParticipants: number = 100,
    durationHours: number = 4
  ): Promise<number> {
    try {
      console.log(`📝 Creating on-chain debate: "${topic}"`);
      console.log(`   Entry Fee: ${entryFee} USDC`);
      console.log(`   Max Participants: ${maxParticipants}`);
      console.log(`   Duration: ${durationHours} hours`);

      const entryFeeWei = ethers.parseUnits(entryFee, 6); // USDC has 6 decimals
      const durationSeconds = Math.floor(durationHours * 3600); // Ensure integer seconds

      const tx = await this.contract.createDebate(
        topic,
        entryFeeWei,
        maxParticipants,
        durationSeconds
      );

      console.log(`⏳ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`);

      // Extract debate ID from event
      let debateId = 0;
      console.log(`🔍 Parsing ${receipt?.logs?.length || 0} transaction logs...`);
      
      for (const log of receipt?.logs || []) {
        console.log(`🔍 Log: ${log.address} topics: ${log.topics?.length || 0}`);
        
        // Try to parse with contract interface first
        let parsed = null;
        try {
          parsed = this.contract.interface.parseLog(log);
          console.log(`🔍 Parsed log: ${parsed?.name}, args:`, parsed?.args);
          
          if (parsed?.name === "DebateCreated") {
            debateId = Number(parsed.args.debateId);
            console.log(`✅ Found DebateCreated event with ID: ${debateId}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Could not parse log with contract interface:`, error.message);
        }
        
        // Fallback: Extract debate ID directly from topics
        // The debate ID is typically in the second topic (index 1)
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

    } catch (error) {
      console.error(`❌ Failed to create on-chain debate:`, error);
      throw error;
    }
  }

  /**
   * Get debate details from on-chain
   * @param debateId The debate ID
   * @returns Debate details
   */
  async getDebate(debateId: number) {
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
      console.error(`❌ Failed to get debate ${debateId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active debates
   * @returns Array of active debate IDs
   */
  async getActiveDebates(): Promise<number[]> {
    try {
      const activeDebates = await this.contract.getActiveDebates();
      return activeDebates.map(id => Number(id));
    } catch (error) {
      console.error(`❌ Failed to get active debates:`, error);
      throw error;
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
