import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function transferUSDC() {
  try {
    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    
    // Contract addresses
    const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;
    const poolAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
    const recipientAddress = '0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7';
    
    console.log('🔄 Initiating USDC Transfer...');
    console.log('USDC Contract:', usdcAddress);
    console.log('Pool Contract:', poolAddress);
    console.log('Recipient:', recipientAddress);
    
    // USDC ABI
    const usdcAbi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function transfer(address to, uint256 amount) returns (bool)'
    ];
    
    // Pool contract ABI
    const poolAbi = [
      'function withdrawPlatformFees() external',
      'function owner() view returns (address)'
    ];
    
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
    
    // Get current balance
    const decimals = await usdcContract.decimals();
    const balance = await usdcContract.balanceOf(poolAddress);
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    console.log('💰 Current Pool Balance:', formattedBalance, 'USDC');
    
    if (balance === 0n) {
      console.log('❌ No USDC to transfer');
      return;
    }
    
    // Get pool owner
    const poolOwner = await poolContract.owner();
    console.log('👤 Pool Owner:', poolOwner);
    
    // Check if private key is provided
    const privateKey = process.env.POOL_OWNER_PRIVATE_KEY;
    
    if (!privateKey) {
      console.log('\n⚠️  PRIVATE KEY REQUIRED:');
      console.log('To execute this transfer, you need to set the POOL_OWNER_PRIVATE_KEY environment variable');
      console.log('Add this to your .env file:');
      console.log('POOL_OWNER_PRIVATE_KEY=your_private_key_here');
      console.log('\nThen run: node transfer-usdc.js');
      return;
    }
    
    // Create wallet with private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('🔑 Wallet Address:', wallet.address);
    
    // Verify wallet matches pool owner
    if (wallet.address.toLowerCase() !== poolOwner.toLowerCase()) {
      console.log('❌ ERROR: Wallet address does not match pool owner');
      console.log('Expected:', poolOwner);
      console.log('Got:', wallet.address);
      return;
    }
    
    // Create contract instance with wallet for signing
    const poolContractWithWallet = new ethers.Contract(poolAddress, poolAbi, wallet);
    
    console.log('\n🚀 Executing withdrawal...');
    console.log(`📤 Withdrawing ${formattedBalance} USDC to owner (${wallet.address})`);
    console.log(`📤 Then you can manually transfer to ${recipientAddress}`);
    
    // Execute withdrawal (sends to owner)
    const tx = await poolContractWithWallet.withdrawPlatformFees();
    console.log('📝 Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Withdrawal completed!');
    console.log('📊 Gas used:', receipt.gasUsed.toString());
    console.log('🔗 Transaction:', `https://sepolia.basescan.org/tx/${tx.hash}`);
    
    // Verify final balance
    const finalBalance = await usdcContract.balanceOf(poolAddress);
    const finalFormattedBalance = ethers.formatUnits(finalBalance, decimals);
    console.log('💰 Final Pool Balance:', finalFormattedBalance, 'USDC');
    
    // Check owner's balance
    const ownerBalance = await usdcContract.balanceOf(wallet.address);
    const ownerFormattedBalance = ethers.formatUnits(ownerBalance, decimals);
    console.log('💰 Owner Balance:', ownerFormattedBalance, 'USDC');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. The USDC has been withdrawn to the owner address');
    console.log('2. You can now manually transfer USDC to:', recipientAddress);
    console.log('3. Or use a wallet to send USDC from owner to recipient');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

transferUSDC();
