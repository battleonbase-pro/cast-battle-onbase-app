import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying DebatePoolV2 to Base Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Base Sepolia USDC address
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const ORACLE_ADDRESS = "0x1DAe81d71810345eEd830782Fd570A871C92919D"; // Oracle address

  console.log("🔗 USDC Address:", USDC_ADDRESS);
  console.log("🔗 Oracle Address:", ORACLE_ADDRESS);

  // Deploy DebatePoolV2
  const DebatePoolV2Factory = await ethers.getContractFactory("DebatePoolV2");
  const debatePool = await DebatePoolV2Factory.deploy(USDC_ADDRESS, ORACLE_ADDRESS);
  
  await debatePool.waitForDeployment();
  const contractAddress = await debatePool.getAddress();

  console.log("✅ DebatePoolV2 deployed to:", contractAddress);
  console.log("🔗 Contract on BaseScan:", `https://sepolia.basescan.org/address/${contractAddress}`);

  // Wait a bit for the contract to be fully confirmed
  console.log("\n⏳ Waiting for contract to be fully confirmed...");
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

  // Verify deployment with error handling
  console.log("\n🔍 Verifying deployment...");
  try {
    const owner = await debatePool.owner();
    const oracle = await debatePool.oracle();
    const usdcToken = await debatePool.usdcToken();
    const platformFee = await debatePool.PLATFORM_FEE_PERCENTAGE();

    console.log("✅ Owner:", owner);
    console.log("✅ Oracle:", oracle);
    console.log("✅ USDC Token:", usdcToken);
    console.log("✅ Platform Fee:", platformFee.toString() + "%");
  } catch (error) {
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
