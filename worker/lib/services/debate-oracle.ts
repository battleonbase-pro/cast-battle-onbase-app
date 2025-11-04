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
    // Create provider for Base Sepolia without ENS resolution
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create wallet with provider, but catch ENS resolution errors
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    } catch (error: any) {
      if (error.code === 'UNSUPPORTED_OPERATION' && error.operation === 'getEnsAddress') {
        // If ENS resolution fails, create wallet without provider and connect manually
        console.log(`🔗 ENS resolution failed, using fallback wallet creation`);
        this.wallet = new ethers.Wallet(privateKey);
        this.wallet = this.wallet.connect(this.provider);
      } else {
        throw error;
      }
    }
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
  }

  /**
   * Sign winner distribution using EIP-712 for MinimalDebatePool
   * @param debateId Debate ID
   * @param winner Winner address
   * @param winnerPrize Prize amount in USDC (with 6 decimals)
   * @returns EIP-712 signature
   */
  async signWinnerDistribution(
    debateId: number,
    winner: string,
    winnerPrize: bigint
  ): Promise<string> {
    // Get chain ID from provider
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    const domain = {
      name: 'MinimalDebatePool',
      version: '1',
      chainId: chainId,
      verifyingContract: this.contractAddress
    };

    const types = {
      WinnerDistribution: [
        { name: 'debateId', type: 'uint256' },
        { name: 'winner', type: 'address' },
        { name: 'winnerPrize', type: 'uint256' }
      ]
    };

    const value = {
      debateId: BigInt(debateId),
      winner: winner,
      winnerPrize: winnerPrize
    };

    const signature = await this.wallet.signTypedData(domain, types, value);
    return signature;
  }

  /**
   * Distribute winner prize on the MinimalDebatePool contract
   * @param debateId Debate ID
   * @param winner Winner address
   * @param winnerPrize Prize amount in USDC (with 6 decimals, e.g., 800000 for 0.8 USDC)
   * @returns Transaction hash
   */
  async distributeWinner(
    debateId: number,
    winner: string,
    winnerPrize: bigint
  ): Promise<string> {
    try {
      console.log(`🏆 Distributing winner prize for debate ${debateId}:`);
      console.log(`   Winner: ${winner}`);
      console.log(`   Prize: ${ethers.formatUnits(winnerPrize, 6)} USDC`);

      // Sign the winner distribution
      const signature = await this.signWinnerDistribution(debateId, winner, winnerPrize);

      // Call the MinimalDebatePool contract
      const tx = await this.contract.distributeWinner(
        debateId,
        winner,
        winnerPrize,
        signature
      );
      
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`✅ Winner prize distributed successfully!`);
      console.log(`   Transaction Hash: ${receipt.hash}`);
      console.log(`   Gas Used: ${receipt.gasUsed}`);

      return receipt.hash;
    } catch (error) {
      console.error(`❌ Failed to distribute winner prize:`, error);
      throw error;
    }
  }

  /**
   * Process battle completion and distribute winner prize
   * @param battleId Battle ID
   * @param winnerAddress Winner's wallet address
   * @param participantCount Number of participants (for calculating total collected)
   */
  async processBattleCompletion(
    battleId: string,
    winnerAddress: string,
    participantCount: number
  ): Promise<void> {
    try {
      console.log(`🔄 Processing battle completion for battle ${battleId}`);
      console.log(`   Winner: ${winnerAddress}`);
      console.log(`   Participants: ${participantCount}`);

      // Get battle details from database
      const battle = await prisma.battle.findUnique({
        where: { id: battleId }
      });

      if (!battle) {
        throw new Error(`Battle ${battleId} not found`);
      }

      if (battle.status !== 'COMPLETED') {
        throw new Error(`Battle ${battleId} is not completed`);
      }

      // Check if battle has a linked debate ID
      // With MinimalDebatePool, debateId should always be set when battle is created
      if (!battle.debateId) {
        throw new Error(
          `Battle ${battleId} must have debateId set in database. ` +
          `Cannot distribute winner without on-chain debate ID. ` +
          `Please ensure battles are created with a debateId.`
        );
      }
      const debateId = battle.debateId;

      // Calculate total collected: each participant paid 1 USDC
      const ENTRY_FEE_USDC = 1; // 1 USDC per participant
      const totalCollected = participantCount * ENTRY_FEE_USDC;
      
      // Calculate winner prize: 80% of total collected
      const winnerPrizePercentage = 0.8; // 80%
      const winnerPrizeUSDC = totalCollected * winnerPrizePercentage;
      
      // Convert to USDC with 6 decimals
      const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);

      console.log(`💰 Prize calculation:`);
      console.log(`   Total collected: ${totalCollected} USDC`);
      console.log(`   Winner prize (80%): ${winnerPrizeUSDC} USDC`);
      console.log(`   Platform fee (20%): ${totalCollected - winnerPrizeUSDC} USDC`);
      console.log(`🔗 Using debate ID: ${debateId}`);

      // Pre-flight check: Verify debate is not already completed
      try {
        const isCompleted = await this.isDebateCompleted(debateId);
        if (isCompleted) {
          console.log(`⚠️ Debate ${debateId} already completed on-chain, skipping distribution`);
          console.log(`   Battle ${battleId} winner distribution was already processed`);
          return; // Skip - no gas wasted
        }
      } catch (error) {
        console.error(`⚠️ Failed to check debate completion status:`, error);
        // Continue anyway - contract will revert if already completed
      }

      // Pre-flight check: Verify contract has sufficient balance
      try {
        const contractBalance = await this.getContractBalance();
        const requiredBalance = parseFloat(ethers.formatUnits(winnerPrize, 6));
        const availableBalance = parseFloat(contractBalance);
        
        if (availableBalance < requiredBalance) {
          throw new Error(
            `Insufficient contract balance. ` +
            `Required: ${requiredBalance} USDC, ` +
            `Available: ${availableBalance} USDC`
          );
        }
        
        console.log(`💰 Contract balance check: ${availableBalance} USDC available (sufficient)`);
      } catch (error) {
        console.error(`⚠️ Failed to check contract balance:`, error);
        // Continue anyway - contract will revert if insufficient
      }

      // Distribute winner prize on MinimalDebatePool contract
      const txHash = await this.distributeWinner(debateId, winnerAddress, winnerPrize);

      console.log(`✅ Battle ${battleId} processed successfully`);
      console.log(`   Transaction: ${txHash}`);
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
   * Check if a debate is completed on-chain
   * @param debateId Debate ID
   * @returns True if debate is completed
   */
  async isDebateCompleted(debateId: number): Promise<boolean> {
    try {
      return await this.contract.isDebateCompleted(debateId);
    } catch (error) {
      console.error(`Failed to check debate completion status for ${debateId}:`, error);
      return false;
    }
  }

  /**
   * Get platform fees for a specific debate
   * @param debateId Debate ID
   * @returns Platform fees in USDC (with 6 decimals)
   */
  async getPlatformFees(debateId: number): Promise<bigint> {
    try {
      return await this.contract.getPlatformFees(debateId);
    } catch (error) {
      console.error(`Failed to get platform fees for ${debateId}:`, error);
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

  // Contract ABI for MinimalDebatePool
  const contractABI = [
    "function distributeWinner(uint256 debateId, address winner, uint256 winnerPrize, bytes memory signature) external",
    "function getContractBalance() external view returns (uint256)",
    "function isDebateCompleted(uint256 debateId) external view returns (bool)",
    "function getPlatformFees(uint256 debateId) external view returns (uint256)",
    "event WinnerDistributed(uint256 indexed debateId, address indexed winner, uint256 winnerPrize, uint256 platformFee)"
  ];

  return new DebateOracle(rpcUrl, privateKey, contractAddress, contractABI);
}
