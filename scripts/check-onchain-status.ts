import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Check on-chain status for a specific debate
 */
async function checkOnChainStatus(debateId: number) {
  console.log(`\n🔍 CHECKING ON-CHAIN STATUS FOR DEBATE ${debateId}\n`);
  console.log('='.repeat(80));

  const contractAddress = process.env.DEBATE_POOL_CONTRACT_ADDRESS || '0xf9BA696bB9dC1c2d727522e7539596918a2066f4';
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || process.env.BASE_RPC || 'https://sepolia.base.org';

  console.log(`📋 Configuration:`);
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   RPC URL: ${rpcUrl}`);
  console.log(`   Debate ID: ${debateId}\n`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Minimal ABI for checking debate completion
    const contractABI = [
      "function isDebateCompleted(uint256 debateId) external view returns (bool)",
      "function getPlatformFees(uint256 debateId) external view returns (uint256)",
      "function getContractBalance() external view returns (uint256)",
      "event WinnerDistributed(uint256 indexed debateId, address indexed winner, uint256 winnerPrize, uint256 platformFee)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Check if debate is completed
    console.log('🔍 Checking debate completion status...');
    const isCompleted = await contract.isDebateCompleted(debateId);
    console.log(`   Debate Completed: ${isCompleted ? '✅ YES' : '❌ NO'}\n`);

    if (isCompleted) {
      console.log('✅ Payout was processed on-chain!\n');
      
      // Try to find the WinnerDistributed event
      console.log('🔍 Searching for WinnerDistributed event...');
      try {
        const filter = contract.filters.WinnerDistributed(debateId);
        const events = await contract.queryFilter(filter);
        
        if (events.length > 0) {
          const event = events[0];
          console.log(`✅ Found WinnerDistributed event:`);
          console.log(`   Transaction Hash: ${event.transactionHash}`);
          console.log(`   Block Number: ${event.blockNumber}`);
          console.log(`   Winner: ${event.args?.winner}`);
          console.log(`   Prize: ${ethers.formatUnits(event.args?.winnerPrize || 0, 6)} USDC`);
          console.log(`   Platform Fee: ${ethers.formatUnits(event.args?.platformFee || 0, 6)} USDC`);
          console.log(`\n🔗 View on BaseScan:`);
          console.log(`   https://sepolia.basescan.org/tx/${event.transactionHash}`);
        } else {
          console.log('⚠️  Debate marked as completed but no WinnerDistributed event found');
        }
      } catch (error: any) {
        console.log(`⚠️  Could not query events: ${error.message}`);
      }

      // Check platform fees
      try {
        const platformFees = await contract.getPlatformFees(debateId);
        console.log(`\n💰 Platform Fees: ${ethers.formatUnits(platformFees, 6)} USDC`);
      } catch (error: any) {
        console.log(`⚠️  Could not get platform fees: ${error.message}`);
      }
    } else {
      console.log('❌ Payout was NOT processed on-chain!');
      console.log('   This means the oracle did not successfully call distributeWinner()\n');
    }

    // Check contract balance
    console.log('\n💰 Checking contract balance...');
    try {
      const balance = await contract.getContractBalance();
      const balanceFormatted = ethers.formatUnits(balance, 6);
      console.log(`   Contract Balance: ${balanceFormatted} USDC`);
      
      if (parseFloat(balanceFormatted) === 0) {
        console.log('   ⚠️  Contract has zero balance');
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not check balance: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error(`\n❌ Error checking on-chain status:`, error.message);
    if (error.code === 'NETWORK_ERROR') {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check your RPC URL');
      console.log('   2. Verify you can connect to Base Sepolia');
      console.log('   3. Check if contract address is correct');
    }
  }
}

// Run the check
const debateId = process.argv[2] ? parseInt(process.argv[2]) : 384092;
checkOnChainStatus(debateId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

