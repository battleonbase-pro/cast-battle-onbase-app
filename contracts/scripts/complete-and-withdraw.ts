import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const DEV_WALLET = "0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7";
  
  try {
    console.log("💰 Completing All Debates and Withdrawing Funds");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Dev Wallet: ${DEV_WALLET}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [signer] = await ethers.getSigners();
    
    console.log(`   Current Signer: ${signer.address}`);
    
    // Check contract owner
    const contractOwner = await contract.owner();
    console.log(`   Contract Owner: ${contractOwner}`);
    
    // Check USDC balance in contract
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    // Get active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    if (activeDebates.length === 0) {
      console.log(`\n✅ No active debates. Attempting direct withdrawal...`);
      
      try {
        const withdrawTx = await contract.withdrawFunds();
        console.log(`   Withdrawal sent: ${withdrawTx.hash}`);
        
        const withdrawReceipt = await withdrawTx.wait();
        console.log(`   Withdrawal confirmed in block: ${withdrawReceipt?.blockNumber}`);
        
        console.log(`\n✅ Withdrawal Complete!`);
        return;
      } catch (error) {
        console.log(`❌ Direct withdrawal failed: ${error.message}`);
      }
    }
    
    // Since we can't easily complete debates without oracle signatures,
    // let's try a different approach: create a new debate with 0 entry fee
    // and then withdraw
    
    console.log(`\n🔄 Attempting alternative approach...`);
    console.log(`   The issue is that active debates might be preventing withdrawal.`);
    console.log(`   Let's try to understand the contract better.`);
    
    // Check if we can call withdrawFunds with a different method
    console.log(`\n💡 Let's try calling withdrawFunds with more gas...`);
    
    try {
      const withdrawTx = await contract.withdrawFunds({
        gasLimit: 500000 // Increase gas limit
      });
      console.log(`   Withdrawal sent: ${withdrawTx.hash}`);
      
      const withdrawReceipt = await withdrawTx.wait();
      console.log(`   Withdrawal confirmed in block: ${withdrawReceipt?.blockNumber}`);
      
      console.log(`\n✅ Withdrawal Complete!`);
      
      // Check final balances
      const contractBalanceAfter = await usdcContract.balanceOf(CONTRACT_ADDRESS);
      const contractBalanceAfterFormatted = ethers.formatUnits(contractBalanceAfter, 6);
      
      const devBalanceAfter = await usdcContract.balanceOf(DEV_WALLET);
      const devBalanceAfterFormatted = ethers.formatUnits(devBalanceAfter, 6);
      
      console.log(`\n🔍 Final Balances:`);
      console.log(`   Contract USDC Balance: ${contractBalanceAfterFormatted} USDC`);
      console.log(`   Dev Wallet USDC Balance: ${devBalanceAfterFormatted} USDC`);
      
    } catch (error) {
      console.log(`❌ Withdrawal with increased gas failed: ${error.message}`);
      
      // Let's try to understand what's happening by checking the contract code
      console.log(`\n🔍 The withdrawFunds function might have additional checks.`);
      console.log(`   Let's check if there are any other issues...`);
      
      // Check if the contract has any other restrictions
      console.log(`\n💡 Possible solutions:`);
      console.log(`   1. The funds might be locked in active debates`);
      console.log(`   2. We might need to complete the debates first`);
      console.log(`   3. There might be a different withdrawal mechanism`);
      
      console.log(`\n🔧 Manual approach:`);
      console.log(`   Since automated withdrawal is failing, you might need to:`);
      console.log(`   1. Complete the active debates manually (requires oracle signatures)`);
      console.log(`   2. Or modify the contract to allow emergency withdrawal`);
      console.log(`   3. Or wait for the debates to expire naturally`);
      
      // Let's check when the debates expire
      console.log(`\n⏰ Checking debate expiration times...`);
      for (const debateId of activeDebates) {
        try {
          const debate = await contract.getDebate(debateId);
          const endTime = new Date(Number(debate.endTime) * 1000);
          const now = new Date();
          const timeLeft = endTime.getTime() - now.getTime();
          
          console.log(`   Debate ${debateId}:`);
          console.log(`     End Time: ${endTime.toISOString()}`);
          console.log(`     Time Left: ${Math.max(0, Math.floor(timeLeft / 1000 / 60))} minutes`);
        } catch (error) {
          console.log(`   Error checking debate ${debateId}: ${error.message}`);
        }
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
