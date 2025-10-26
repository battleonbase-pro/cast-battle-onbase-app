import { ethers } from "hardhat";

async function main() {
  // Get contract address from environment variable with fallback
  const CONTRACT_ADDRESS = process.env.DEBATE_POOL_CONTRACT_ADDRESS || "0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
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
