import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Base Sepolia Network Connection...");
  
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`✅ Latest Block: ${blockNumber}`);
    console.log(`✅ RPC URL: ${ethers.provider.connection?.url || 'Default'}`);
    
    // Check if we're on the right network
    if (network.chainId === BigInt(84532)) {
      console.log("✅ Connected to Base Sepolia testnet");
    } else {
      console.log(`⚠️  Expected Chain ID 84532 (Base Sepolia), got ${network.chainId}`);
    }
    
  } catch (error) {
    console.error("❌ Network connection error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
