import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

// Get production database URL
function getProductionDatabaseUrl(): string {
  try {
    const dbUrl = execSync('gcloud secrets versions access latest --secret="database-url"', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return dbUrl;
  } catch (error) {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    throw error;
  }
}

const databaseUrl = process.env.DATABASE_URL || getProductionDatabaseUrl();
const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } }
});

// Simple oracle implementation for payout
class SimpleOracle {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    
    // Get private key from env or GCP secrets
    let privateKeyRaw = process.env.ORACLE_PRIVATE_KEY || '';
    if (!privateKeyRaw) {
      try {
        privateKeyRaw = execSync('gcloud secrets versions access latest --secret="oracle-private-key" --project=battle-worker-phraseflow', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
      } catch (error) {
        throw new Error('ORACLE_PRIVATE_KEY not found in env or GCP secrets');
      }
    }
    
    const contractAddressRaw = process.env.DEBATE_POOL_CONTRACT_ADDRESS || '0xf9BA696bB9dC1c2d727522e7539596918a2066f4';

    // Trim whitespace/newlines
    const privateKey = privateKeyRaw.trim();
    const contractAddress = contractAddressRaw.trim();

    if (!privateKey || privateKey.length !== 66) {
      throw new Error(`Invalid ORACLE_PRIVATE_KEY (length: ${privateKey.length}, expected 66)`);
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    const contractABI = [
      "function distributeWinner(uint256 debateId, address winner, uint256 winnerPrize, bytes memory signature) external",
      "function isDebateCompleted(uint256 debateId) external view returns (bool)"
    ];
    
    this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
  }

  async signWinnerDistribution(debateId: number, winner: string, winnerPrize: bigint): Promise<string> {
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    const domain = {
      name: 'MinimalDebatePool',
      version: '1',
      chainId: chainId,
      verifyingContract: this.contract.target
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

    return await this.wallet.signTypedData(domain, types, value);
  }

  async distributeWinner(debateId: number, winner: string, winnerPrize: bigint): Promise<string> {
    const signature = await this.signWinnerDistribution(debateId, winner, winnerPrize);
    const tx = await this.contract.distributeWinner(debateId, winner, winnerPrize, signature);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async isDebateCompleted(debateId: number): Promise<boolean> {
    return await this.contract.isDebateCompleted(debateId);
  }
}

async function triggerPayout(battleTitle: string) {
  console.log(`\n🔧 MANUAL PAYOUT TRIGGER FOR: "${battleTitle}"\n`);
  console.log('='.repeat(80));

  try {
    // Find battle
    const battle = await prisma.battle.findFirst({
      where: {
        title: { contains: battleTitle, mode: 'insensitive' }
      },
      include: {
        participants: { include: { user: true } },
        winners: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!battle) {
      console.log('❌ Battle not found');
      return;
    }

    console.log(`✅ Found battle: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Debate ID: ${battle.debateId || '❌ MISSING'}`);

    // Validation
    if (battle.status !== 'COMPLETED') {
      console.log(`❌ Battle is not COMPLETED`);
      return;
    }

    if (!battle.debateId) {
      console.log('❌ Missing debateId');
      return;
    }

    if (battle.winners.length === 0) {
      console.log('❌ No winners found');
      return;
    }

    const winner = battle.winners[0];
    const winnerUser = winner.user;

    if (!winnerUser?.address) {
      console.log('❌ Winner has no wallet address');
      return;
    }

    const participantCount = battle.participants.length;
    if (participantCount === 0) {
      console.log('❌ No participants found');
      return;
    }

    // Calculate prize
    const ENTRY_FEE_USDC = 1;
    const totalCollected = participantCount * ENTRY_FEE_USDC;
    const winnerPrizeUSDC = totalCollected * 0.8;
    const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);

    console.log(`\n📋 Payout Details:`);
    console.log(`   Winner: ${winnerUser.address}`);
    console.log(`   Participants: ${participantCount}`);
    console.log(`   Prize: ${winnerPrizeUSDC} USDC`);

    // Initialize oracle
    console.log(`\n🚀 Initializing Oracle...`);
    const oracle = new SimpleOracle();
    console.log(`✅ Oracle initialized: ${oracle.wallet.address}`);

    // Check on-chain status
    console.log(`\n🔍 Checking On-Chain Status...`);
    const isCompleted = await oracle.isDebateCompleted(battle.debateId);
    if (isCompleted) {
      console.log(`⚠️  Debate ${battle.debateId} already completed on-chain`);
      console.log(`   Payout may have already been processed`);
      return;
    }

    // Trigger payout
    console.log(`\n💰 Triggering Payout...`);
    const txHash = await oracle.distributeWinner(battle.debateId, winnerUser.address, winnerPrize);
    
    console.log(`\n✅ Payout triggered successfully!`);
    console.log(`   Transaction Hash: ${txHash}`);
    console.log(`   View on BaseScan: https://sepolia.basescan.org/tx/${txHash}`);

  } catch (error: any) {
    console.error(`\n❌ Payout failed: ${error.message}`);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
const battleTitle = process.argv[2] || '';
if (!battleTitle) {
  console.log('Usage: npx tsx scripts/manual-payout-trigger.ts "Battle Title"');
  process.exit(1);
}

triggerPayout(battleTitle)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


