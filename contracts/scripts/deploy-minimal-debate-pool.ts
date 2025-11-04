import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying MinimalDebatePool to Base Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Base Sepolia USDC address
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  
  // Oracle address from environment
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;
  
  if (!ORACLE_ADDRESS) {
    throw new Error("❌ Please set ORACLE_ADDRESS in .env file");
  }

  console.log("🔗 USDC Address:", USDC_ADDRESS);
  console.log("🔗 Oracle Address:", ORACLE_ADDRESS);

  // Deploy MinimalDebatePool
  const MinimalDebatePoolFactory = await ethers.getContractFactory("MinimalDebatePool");
  const minimalDebatePool = await MinimalDebatePoolFactory.deploy(USDC_ADDRESS, ORACLE_ADDRESS);
  
  await minimalDebatePool.waitForDeployment();
  const contractAddress = await minimalDebatePool.getAddress();

  console.log("✅ MinimalDebatePool deployed to:", contractAddress);
  console.log("🔗 Contract on BaseScan:", `https://sepolia.basescan.org/address/${contractAddress}`);

  // Wait a bit for the contract to be fully confirmed
  console.log("\n⏳ Waiting for contract to be fully confirmed...");
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

  // Verify deployment with error handling
  console.log("\n🔍 Verifying deployment...");
  try {
    const owner = await minimalDebatePool.owner();
    const oracle = await minimalDebatePool.oracle();
    const usdcToken = await minimalDebatePool.usdcToken();
    const platformFee = await minimalDebatePool.PLATFORM_FEE_PERCENTAGE();
    const paused = await minimalDebatePool.paused();

    console.log("✅ Owner:", owner);
    console.log("✅ Oracle:", oracle);
    console.log("✅ USDC Token:", usdcToken);
    console.log("✅ Platform Fee:", platformFee.toString() + "%");
    console.log("✅ Paused:", paused);
  } catch (error: any) {
    console.log("⚠️ Verification failed (contract still being mined):", error.message);
    console.log("✅ Contract deployed successfully to:", contractAddress);
    console.log("🔗 Check BaseScan:", `https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("⏳ Wait a few minutes and run verification script separately");
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    network: "base-sepolia",
    timestamp: new Date().toISOString(),
    usdcAddress: USDC_ADDRESS,
    oracleAddress: ORACLE_ADDRESS
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save contract address to file
  const fs = require('fs');
  fs.writeFileSync('deployed-address.txt', contractAddress);
  console.log(`\n💾 Contract address saved to deployed-address.txt`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Update environment variables with new contract address");
  console.log("2. Update frontend to use new contract");
  console.log("3. Update worker to use new contract");
  console.log("4. Test end-to-end flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

