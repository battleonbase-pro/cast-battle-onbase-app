import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

// Get production database URL from GCP secrets or environment
function getProductionDatabaseUrl(): string {
  try {
    // Try to get from GCP secrets first
    const dbUrl = execSync('gcloud secrets versions access latest --secret="database-url"', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return dbUrl;
  } catch (error) {
    // Fall back to environment variable
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    console.error('❌ Failed to get database URL. Please set DATABASE_URL environment variable or configure GCP secrets.');
    throw error;
  }
}

const databaseUrl = process.env.DATABASE_URL || getProductionDatabaseUrl();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

/**
 * Comprehensive payout diagnostic script
 * Checks all aspects of the payout flow for a specific battle
 */
async function diagnosePayoutIssue(battleTitle: string) {
  console.log(`\n🔍 DIAGNOSING PAYOUT ISSUE FOR: "${battleTitle}"\n`);
  console.log('='.repeat(80));

  try {
    // Step 1: Find the battle
    console.log('\n📋 STEP 1: Finding Battle in Database...');
    const battle = await prisma.battle.findFirst({
      where: {
        title: {
          contains: battleTitle,
          mode: 'insensitive'
        }
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        casts: {
          include: {
            user: true
          }
        },
        winners: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!battle) {
      console.log('❌ Battle not found in database');
      
      // Try to find similar battles
      const similarBattles = await prisma.battle.findMany({
        where: {
          title: {
            contains: 'trump',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
      
      if (similarBattles.length > 0) {
        console.log('\n📋 Found similar battles:');
        similarBattles.forEach(b => {
          console.log(`  - ${b.title} (${b.status}) - Created: ${b.createdAt}`);
        });
      }
      
      return;
    }

    console.log('✅ Battle found!');
    console.log(`   ID: ${battle.id}`);
    console.log(`   Title: ${battle.title}`);
    console.log(`   Status: ${battle.status}`);
    console.log(`   Created: ${battle.createdAt}`);
    console.log(`   End Time: ${battle.endTime}`);
    console.log(`   Debate ID: ${battle.debateId || '❌ NULL - CRITICAL ISSUE!'}`);

    // Step 2: Check battle status
    console.log('\n📊 STEP 2: Checking Battle Status...');
    if (battle.status !== 'COMPLETED') {
      console.log(`❌ Battle status is "${battle.status}", not "COMPLETED"`);
      console.log('   This means the battle was not properly completed');
      return;
    }
    console.log('✅ Battle status is COMPLETED');

    // Step 3: Check for winners
    console.log('\n🏆 STEP 3: Checking Winners...');
    if (battle.winners.length === 0) {
      console.log('❌ No winners recorded in database!');
      return;
    }

    const winner = battle.winners[0];
    console.log(`✅ Winner found:`);
    console.log(`   Winner User ID: ${winner.userId}`);
    console.log(`   Winner Position: ${winner.position}`);
    console.log(`   Winner Prize: ${winner.prize || 'N/A'}`);

    const winnerUser = winner.user;
    if (!winnerUser) {
      console.log('❌ Winner user record not found!');
      return;
    }

    console.log(`   Winner Address: ${winnerUser.address || '❌ NULL - CRITICAL ISSUE!'}`);
    if (!winnerUser.address) {
      console.log('\n⚠️  CRITICAL: Winner has no wallet address!');
      console.log('   Payout cannot proceed without a wallet address.');
      return;
    }

    // Step 4: Check participants
    console.log('\n👥 STEP 4: Checking Participants...');
    const participantCount = battle.participants.length;
    console.log(`   Total Participants: ${participantCount}`);
    
    if (participantCount === 0) {
      console.log('❌ No participants found! Payout cannot be calculated.');
      return;
    }

    // Calculate expected prize
    const ENTRY_FEE_USDC = 1;
    const totalCollected = participantCount * ENTRY_FEE_USDC;
    const winnerPrizeUSDC = totalCollected * 0.8;
    console.log(`   Expected Prize: ${winnerPrizeUSDC} USDC (80% of ${totalCollected} USDC)`);

    // Step 5: Check debateId
    console.log('\n🔗 STEP 5: Checking On-Chain Debate ID...');
    if (!battle.debateId) {
      console.log('❌ CRITICAL: debateId is NULL!');
      console.log('   This battle cannot have on-chain payout without a debateId.');
      console.log('   Possible causes:');
      console.log('   1. Battle was created before debateId was set');
      console.log('   2. Battle creation failed to link debateId');
      console.log('   3. Database migration issue');
      return;
    }
    console.log(`✅ Debate ID: ${battle.debateId}`);

    // Step 6: Check contract state (if contract address is available)
    console.log('\n⛓️  STEP 6: Checking On-Chain Contract State...');
    const contractAddress = process.env.DEBATE_POOL_CONTRACT_ADDRESS;
    const rpcUrl = process.env.BASE_SEPOLIA_RPC || process.env.BASE_RPC || 'https://sepolia.base.org';
    
    if (!contractAddress) {
      console.log('⚠️  Contract address not found in environment variables');
      console.log('   Skipping on-chain checks');
    } else {
      console.log(`   Contract Address: ${contractAddress}`);
      console.log(`   RPC URL: ${rpcUrl}`);
      
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Minimal ABI for checking debate completion
        const contractABI = [
          "function isDebateCompleted(uint256 debateId) external view returns (bool)",
          "event WinnerDistributed(uint256 indexed debateId, address indexed winner, uint256 winnerPrize, uint256 platformFee)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Check if debate is completed on-chain
        const isCompleted = await contract.isDebateCompleted(battle.debateId);
        console.log(`   Debate ${battle.debateId} Completed On-Chain: ${isCompleted ? '✅ YES' : '❌ NO'}`);
        
        if (isCompleted) {
          console.log('   ✅ Payout was already processed on-chain');
          console.log('   Checking for transaction logs...');
          
          // Try to find the WinnerDistributed event
          try {
            const filter = contract.filters.WinnerDistributed(battle.debateId);
            const events = await contract.queryFilter(filter);
            
            if (events.length > 0) {
              const event = events[0];
              console.log(`   ✅ Found WinnerDistributed event:`);
              console.log(`      Transaction Hash: ${event.transactionHash}`);
              console.log(`      Block Number: ${event.blockNumber}`);
              console.log(`      Winner: ${event.args?.winner}`);
              console.log(`      Prize: ${ethers.formatUnits(event.args?.winnerPrize || 0, 6)} USDC`);
              
              // Check if winner address matches
              if (event.args?.winner?.toLowerCase() === winnerUser.address?.toLowerCase()) {
                console.log('   ✅ Winner address matches!');
              } else {
                console.log(`   ⚠️  Winner address mismatch!`);
                console.log(`      Database: ${winnerUser.address}`);
                console.log(`      On-Chain: ${event.args?.winner}`);
              }
            } else {
              console.log('   ⚠️  Debate marked as completed but no WinnerDistributed event found');
            }
          } catch (error: any) {
            console.log(`   ⚠️  Could not query events: ${error.message}`);
          }
        } else {
          console.log('   ❌ Payout was NOT processed on-chain!');
          console.log('   This means the oracle did not successfully call distributeWinner()');
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not check contract state: ${error.message}`);
      }
    }

    // Step 7: Check for error patterns
    console.log('\n🐛 STEP 7: Analyzing Potential Failure Points...');
    const issues: string[] = [];
    
    if (!battle.debateId) {
      issues.push('❌ Missing debateId - cannot trigger on-chain payout');
    }
    
    if (!winnerUser.address) {
      issues.push('❌ Missing winner wallet address - cannot send payout');
    }
    
    if (participantCount === 0) {
      issues.push('❌ No participants - prize calculation would be 0');
    }
    
    if (battle.status !== 'COMPLETED') {
      issues.push(`❌ Battle status is "${battle.status}" instead of "COMPLETED"`);
    }

    if (issues.length > 0) {
      console.log('   Issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('   ✅ No obvious issues found in database');
      console.log('   ⚠️  Check worker logs for payout errors');
      console.log('   ⚠️  Check if oracle service is running');
      console.log('   ⚠️  Check if ORACLE_PRIVATE_KEY is set correctly');
    }

    // Step 8: Summary
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Battle ID: ${battle.id}`);
    console.log(`Battle Title: ${battle.title}`);
    console.log(`Status: ${battle.status}`);
    console.log(`Debate ID: ${battle.debateId || '❌ MISSING'}`);
    console.log(`Winner Address: ${winnerUser.address || '❌ MISSING'}`);
    console.log(`Participants: ${participantCount}`);
    console.log(`Expected Prize: ${winnerPrizeUSDC} USDC`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Check worker service logs for payout errors');
    console.log('   2. Verify ORACLE_PRIVATE_KEY is set correctly');
    console.log('   3. Check if oracle wallet has sufficient ETH for gas');
    console.log('   4. Verify contract has sufficient USDC balance');
    console.log('   5. If payout failed, manually trigger payout using fix script');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Error during diagnosis:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
const battleTitle = process.argv[2] || 'trump crypto deal';
diagnosePayoutIssue(battleTitle)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

