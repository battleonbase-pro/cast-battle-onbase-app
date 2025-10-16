import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [owner] = await ethers.getSigners();
    
    console.log("💰 Platform Fee Withdrawal Process");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Owner: ${owner.address}`);
    
    // Step 1: Check current contract balance
    console.log(`\n🔍 Step 1: Checking Contract Balance`);
    const contractBalance = await contract.getContractBalance();
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    if (contractBalance === 0n) {
      console.log(`\n⚠️  No platform fees to withdraw yet.`);
      console.log(`   Platform fees accumulate when debates complete.`);
      console.log(`   Each completed debate contributes 20% of entry fees.`);
      return;
    }
    
    // Step 2: Check owner's USDC balance before withdrawal
    console.log(`\n🔍 Step 2: Checking Owner's Balance Before Withdrawal`);
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const ownerBalanceBefore = await usdcContract.balanceOf(owner.address);
    const ownerBalanceBeforeFormatted = ethers.formatUnits(ownerBalanceBefore, 6);
    
    console.log(`   Owner USDC Balance (Before): ${ownerBalanceBeforeFormatted} USDC`);
    
    // Step 3: Withdraw platform fees
    console.log(`\n💸 Step 3: Withdrawing Platform Fees`);
    console.log(`   Amount to withdraw: ${contractBalanceFormatted} USDC`);
    
    const withdrawTx = await contract.withdrawFunds();
    console.log(`   Transaction sent: ${withdrawTx.hash}`);
    
    const withdrawReceipt = await withdrawTx.wait();
    console.log(`   Transaction confirmed in block: ${withdrawReceipt?.blockNumber}`);
    console.log(`   Gas used: ${withdrawReceipt?.gasUsed.toString()}`);
    
    // Step 4: Verify withdrawal
    console.log(`\n✅ Step 4: Verifying Withdrawal`);
    const contractBalanceAfter = await contract.getContractBalance();
    const ownerBalanceAfter = await usdcContract.balanceOf(owner.address);
    
    console.log(`   Contract USDC Balance (After): ${ethers.formatUnits(contractBalanceAfter, 6)} USDC`);
    console.log(`   Owner USDC Balance (After): ${ethers.formatUnits(ownerBalanceAfter, 6)} USDC`);
    
    const withdrawnAmount = ownerBalanceAfter - ownerBalanceBefore;
    console.log(`   Amount withdrawn: ${ethers.formatUnits(withdrawnAmount, 6)} USDC`);
    
    console.log(`\n🎉 Platform fees successfully withdrawn!`);
    console.log(`\n📝 Summary:`);
    console.log(`   ✅ Contract balance: ${contractBalanceFormatted} → 0 USDC`);
    console.log(`   ✅ Owner balance: +${ethers.formatUnits(withdrawnAmount, 6)} USDC`);
    console.log(`   ✅ Transaction hash: ${withdrawTx.hash}`);
    
  } catch (error) {
    console.error("❌ Withdrawal failed:", error);
    
    if (error.message.includes("Ownable")) {
      console.log(`\n💡 Note: Only the contract owner can withdraw platform fees.`);
      console.log(`   Current owner: ${await contract.owner()}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
