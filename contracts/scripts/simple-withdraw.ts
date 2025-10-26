import { ethers } from "hardhat";

async function main() {
  // Get contract address from environment variable - REQUIRED
  const CONTRACT_ADDRESS = process.env.DEBATE_POOL_CONTRACT_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  
  if (!CONTRACT_ADDRESS || !USDC_ADDRESS) {
    console.error("❌ Error: Environment variables not set!");
    console.error("   Please set DEBATE_POOL_CONTRACT_ADDRESS and USDC_ADDRESS in your .env file");
    console.error("   Copy contracts/env.example to contracts/.env and configure it");
    process.exit(1);
  }
  
  try {
    console.log("💰 Withdrawing All USDC from Contract");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [owner] = await ethers.getSigners();
    
    console.log(`   Owner: ${owner.address}`);
    
    // Check contract USDC balance
    const usdcContract = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`\n   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    if (contractBalance === 0n) {
      console.log(`\n⚠️  No USDC to withdraw.`);
      return;
    }
    
    // Check owner balance before
    const ownerBalanceBefore = await usdcContract.balanceOf(owner.address);
    console.log(`   Owner Balance (Before): ${ethers.formatUnits(ownerBalanceBefore, 6)} USDC`);
    
    // Withdraw all funds using withdrawPlatformFees()
    console.log(`\n💸 Calling withdrawPlatformFees()...`);
    const withdrawTx = await contract.withdrawPlatformFees();
    console.log(`   Transaction: ${withdrawTx.hash}`);
    
    const receipt = await withdrawTx.wait();
    console.log(`   Confirmed in block: ${receipt?.blockNumber}`);
    console.log(`   Gas used: ${receipt?.gasUsed.toString()}`);
    
    // Check balances after
    console.log(`\n✅ Withdrawal Complete!`);
    const contractBalanceAfter = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const ownerBalanceAfter = await usdcContract.balanceOf(owner.address);
    
    console.log(`   Contract Balance (After): ${ethers.formatUnits(contractBalanceAfter, 6)} USDC`);
    console.log(`   Owner Balance (After): ${ethers.formatUnits(ownerBalanceAfter, 6)} USDC`);
    console.log(`   Amount Withdrawn: ${contractBalanceFormatted} USDC`);
    
  } catch (error) {
    console.error("❌ Withdrawal failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
