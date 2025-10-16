import { ethers } from "hardhat";

async function main() {
  const oracleAddress = "0x1DAe81d71810345eEd830782Fd570A871C92919D";
  
  console.log("🔍 Checking Oracle Wallet Balance...");
  console.log(`Oracle Address: ${oracleAddress}`);
  
  try {
    const balance = await ethers.provider.getBalance(oracleAddress);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log(`\n💰 ETH Balance: ${balanceInEth} ETH`);
    console.log(`💰 Wei Balance: ${balance.toString()} wei`);
    
    // Check if balance is sufficient for gas fees
    const minBalanceForGas = ethers.parseEther("0.01"); // 0.01 ETH minimum
    if (balance >= minBalanceForGas) {
      console.log("✅ Sufficient balance for gas fees");
    } else {
      console.log("⚠️  Low balance - consider funding the oracle wallet");
      console.log(`   Recommended minimum: 0.01 ETH`);
    }
    
    // Also check USDC balance (only for Base Sepolia)
    const network = await ethers.provider.getNetwork();
    if (network.chainId === BigInt(84532)) { // Base Sepolia
      const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
      try {
        const usdcContract = await ethers.getContractAt("IERC20", usdcAddress);
        const usdcBalance = await usdcContract.balanceOf(oracleAddress);
        const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, 6); // USDC has 6 decimals
        console.log(`\n💵 USDC Balance: ${usdcBalanceFormatted} USDC`);
      } catch (error) {
        console.log(`\n💵 USDC Balance: Error checking (${error.message})`);
      }
    } else {
      console.log(`\n💵 USDC Balance: Not checked (different network - Chain ID: ${network.chainId})`);
    }
    
  } catch (error) {
    console.error("❌ Error checking balance:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
