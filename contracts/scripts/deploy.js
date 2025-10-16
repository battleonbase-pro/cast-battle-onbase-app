const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying DebatePool to Base Sepolia...");

  // Base Sepolia USDC address (testnet) - ensure it's a proper address
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Oracle address (your backend wallet) - ensure it's a proper address
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || "0x0000000000000000000000000000000000000000";

  if (ORACLE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Please set ORACLE_ADDRESS in .env file");
    process.exit(1);
  }

  console.log("📋 Deployment Configuration:");
  console.log(`   USDC Address: ${USDC_ADDRESS}`);
  console.log(`   Oracle Address: ${ORACLE_ADDRESS}`);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}`);

  // Deploy the contract using deployContract method
  console.log("📤 Deploying contract...");
  const debatePool = await hre.ethers.deployContract("DebatePool", [USDC_ADDRESS, ORACLE_ADDRESS]);

  console.log("⏳ Waiting for deployment...");
  await debatePool.waitForDeployment();
  
  const contractAddress = await debatePool.getAddress();

  console.log("✅ DebatePool deployed successfully!");
  console.log(`   Contract Address: ${contractAddress}`);
  
  const deploymentTx = debatePool.deploymentTransaction();
  if (deploymentTx) {
    console.log(`   Transaction Hash: ${deploymentTx.hash}`);
  }

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const usdcToken = await debatePool.usdcToken();
  const oracle = await debatePool.oracle();
  const platformFee = await debatePool.PLATFORM_FEE_PERCENTAGE();

  console.log(`   USDC Token: ${usdcToken}`);
  console.log(`   Oracle: ${oracle}`);
  console.log(`   Platform Fee: ${platformFee}%`);

  console.log("\n📝 Next Steps:");
  console.log("1. Update your backend with the contract address");
  console.log("2. Fund the oracle wallet for gas fees");
  console.log("3. Test the contract with a sample debate");
  console.log("4. Verify contract on Basescan (optional)");

  console.log("\n🔗 Contract on Basescan:");
  console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
  
  // Save contract address to file
  const fs = require('fs');
  fs.writeFileSync('deployed-address.txt', contractAddress);
  console.log(`\n💾 Contract address saved to deployed-address.txt`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
