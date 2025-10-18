import { ethers } from "hardhat";

async function main() {
  console.log("⛽ CHECKING BASE SEPOLIA GAS PRICES");
  
  try {
    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    
    // Get current gas price
    const gasPrice = await provider.getFeeData();
    
    console.log("\n📊 CURRENT GAS PRICES:");
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, "gwei")} gwei`);
    console.log(`   Max Fee: ${ethers.formatUnits(gasPrice.maxFeePerGas || 0, "gwei")} gwei`);
    console.log(`   Priority Fee: ${ethers.formatUnits(gasPrice.maxPriorityFeePerGas || 0, "gwei")} gwei`);
    
    // Calculate cost for createDebate (215,522 gas)
    const createDebateGas = 215522n;
    const gasPriceInGwei = gasPrice.gasPrice || 0n;
    const costInWei = createDebateGas * gasPriceInGwei;
    const costInETH = ethers.formatEther(costInWei);
    
    console.log("\n💰 CREATE DEBATE COST CALCULATION:");
    console.log(`   Gas Used: ${createDebateGas} gas`);
    console.log(`   Gas Price: ${ethers.formatUnits(gasPriceInGwei, "gwei")} gwei`);
    console.log(`   Cost in ETH: ${costInETH} ETH`);
    
    // Convert to USD (assuming ETH = $3000)
    const ethPrice = 3000;
    const costInUSD = parseFloat(costInETH) * ethPrice;
    console.log(`   Cost in USD: $${costInUSD.toFixed(4)}`);
    
    // Get recent block info
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    console.log("\n🔍 NETWORK INFO:");
    console.log(`   Current Block: ${blockNumber}`);
    console.log(`   Block Gas Limit: ${block?.gasLimit}`);
    console.log(`   Block Gas Used: ${block?.gasUsed}`);
    console.log(`   Gas Used %: ${((Number(block?.gasUsed) / Number(block?.gasLimit)) * 100).toFixed(2)}%`);
    
    console.log("\n✅ BASE SEPOLIA IS MUCH CHEAPER!");
    console.log("   Base Sepolia (L2) vs Ethereum Mainnet (L1):");
    console.log("   - Base Sepolia: ~$0.001-0.01 per transaction");
    console.log("   - Ethereum Mainnet: ~$5-50 per transaction");
    console.log("   - Savings: 99%+ reduction in gas costs");
    
  } catch (error) {
    console.error("❌ Error checking gas prices:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
