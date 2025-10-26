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
  const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
  
  const owner = await contract.owner();
  console.log("📋 Contract Owner:", owner);
  
  const [signer] = await ethers.getSigners();
  console.log("📝 Current Signer:", signer.address);
  
  const oracle = await contract.oracle();
  console.log("🤖 Oracle Address:", oracle);
  
  console.log("\n🔍 Verification:");
  console.log("   Signer is Owner?", signer.address.toLowerCase() === owner.toLowerCase());
  console.log("   Signer is Oracle?", signer.address.toLowerCase() === oracle.toLowerCase());
  
  // Check USDC balance
  const usdcContract = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
  console.log("\n💰 Contract USDC Balance:", ethers.formatUnits(contractBalance, 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
