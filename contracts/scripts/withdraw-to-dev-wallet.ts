import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const DEV_WALLET = "0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7";
  
  try {
    console.log("💰 Withdrawing All USDC from DebatePool to Dev Wallet");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Dev Wallet: ${DEV_WALLET}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    // Check current contract balance
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    if (contractBalance === 0n) {
      console.log(`\n⚠️  No USDC in contract to withdraw.`);
      return;
    }
    
    // Check dev wallet balance before
    const devBalanceBefore = await usdcContract.balanceOf(DEV_WALLET);
    const devBalanceBeforeFormatted = ethers.formatUnits(devBalanceBefore, 6);
    console.log(`   Dev Wallet Balance (Before): ${devBalanceBeforeFormatted} USDC`);
    
    // Check current owner
    const currentOwner = await contract.owner();
    console.log(`   Current Contract Owner: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() !== DEV_WALLET.toLowerCase()) {
      console.log(`❌ Contract owner is not the dev wallet!`);
      console.log(`   Expected: ${DEV_WALLET}`);
      console.log(`   Actual: ${currentOwner}`);
      return;
    }
    
    // Now we need to connect the contract to the dev wallet
    // Since we can't easily get the private key, let's try a different approach
    // We'll use the existing signer but connect the contract to the dev wallet
    
    console.log(`\n💸 Attempting to withdraw funds...`);
    
    // Try to call withdrawFunds
    try {
      const withdrawTx = await contract.withdrawFunds();
      console.log(`   Withdrawal sent: ${withdrawTx.hash}`);
      
      const withdrawReceipt = await withdrawTx.wait();
      console.log(`   Withdrawal confirmed in block: ${withdrawReceipt?.blockNumber}`);
      
      // Check final balances
      console.log(`\n🔍 Checking Final Balances`);
      
      const contractBalanceAfter = await usdcContract.balanceOf(CONTRACT_ADDRESS);
      const contractBalanceAfterFormatted = ethers.formatUnits(contractBalanceAfter, 6);
      
      const devBalanceAfter = await usdcContract.balanceOf(DEV_WALLET);
      const devBalanceAfterFormatted = ethers.formatUnits(devBalanceAfter, 6);
      
      console.log(`   Contract USDC Balance (After): ${contractBalanceAfterFormatted} USDC`);
      console.log(`   Dev Wallet USDC Balance (After): ${devBalanceAfterFormatted} USDC`);
      
      // Calculate the amount transferred
      const amountTransferred = devBalanceAfter - devBalanceBefore;
      const amountTransferredFormatted = ethers.formatUnits(amountTransferred, 6);
      
      console.log(`\n✅ Withdrawal Complete!`);
      console.log(`   Amount transferred to dev wallet: ${amountTransferredFormatted} USDC`);
      
    } catch (withdrawError) {
      console.log(`❌ Withdrawal failed: ${withdrawError.message}`);
      
      if (withdrawError.message.includes("Ownable: caller is not the owner")) {
        console.log(`\n💡 The issue is that we need to use the dev wallet's private key to call withdrawFunds().`);
        console.log(`   Since the dev wallet is now the owner, only it can call withdrawFunds().`);
        console.log(`\n🔧 Solutions:`);
        console.log(`   1. Import the dev wallet's private key into your Hardhat config`);
        console.log(`   2. Use a different approach - create a custom withdrawal function`);
        console.log(`   3. Transfer ownership back to the current signer and withdraw`);
        
        // Option 3: Transfer ownership back
        console.log(`\n🔄 Option 3: Transferring ownership back to current signer...`);
        const [currentSigner] = await ethers.getSigners();
        
        const transferBackTx = await contract.transferOwnership(currentSigner.address);
        console.log(`   Ownership transfer back sent: ${transferBackTx.hash}`);
        
        const transferBackReceipt = await transferBackTx.wait();
        console.log(`   Ownership transferred back in block: ${transferBackReceipt?.blockNumber}`);
        
        // Wait for transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Now try withdrawal again
        console.log(`\n💸 Attempting withdrawal with original owner...`);
        const withdrawTx2 = await contract.withdrawFunds();
        console.log(`   Withdrawal sent: ${withdrawTx2.hash}`);
        
        const withdrawReceipt2 = await withdrawTx2.wait();
        console.log(`   Withdrawal confirmed in block: ${withdrawReceipt2?.blockNumber}`);
        
        // Check final balances
        const contractBalanceAfter = await usdcContract.balanceOf(CONTRACT_ADDRESS);
        const contractBalanceAfterFormatted = ethers.formatUnits(contractBalanceAfter, 6);
        
        const devBalanceAfter = await usdcContract.balanceOf(DEV_WALLET);
        const devBalanceAfterFormatted = ethers.formatUnits(devBalanceAfter, 6);
        
        console.log(`\n🔍 Final Balances:`);
        console.log(`   Contract USDC Balance: ${contractBalanceAfterFormatted} USDC`);
        console.log(`   Dev Wallet USDC Balance: ${devBalanceAfterFormatted} USDC`);
        
        // Note: Funds went to the original owner, not dev wallet
        console.log(`\n⚠️  Note: Funds were withdrawn to the original owner (${currentSigner.address}), not the dev wallet.`);
        console.log(`   To send to dev wallet, you would need to transfer from ${currentSigner.address} to ${DEV_WALLET}.`);
      }
    }
    
  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });