import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployMinimalDebatePool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("🚀 Deploying MinimalDebatePool to Base Sepolia...");
  console.log(`Deployer: ${deployer}`);

  // Base Sepolia USDC address
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Oracle address from environment
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;
  
  if (!ORACLE_ADDRESS) {
    throw new Error("❌ Please set ORACLE_ADDRESS in .env file");
  }

  console.log("📋 Deployment Configuration:");
  console.log(`   USDC Address: ${USDC_ADDRESS}`);
  console.log(`   Oracle Address: ${ORACLE_ADDRESS}`);

  // Deploy the contract
  const minimalDebatePool = await deploy("MinimalDebatePool", {
    from: deployer,
    args: [USDC_ADDRESS, ORACLE_ADDRESS],
    log: true,
    waitConfirmations: 1,
  });

  console.log("✅ MinimalDebatePool deployed successfully!");
  console.log(`   Contract Address: ${minimalDebatePool.address}`);
  console.log(`   Transaction Hash: ${minimalDebatePool.transactionHash}`);

  // Verify deployment
  if (minimalDebatePool.newlyDeployed) {
    console.log("\n🔍 Verifying deployment...");
    try {
      const contract = await ethers.getContractAt("MinimalDebatePool", minimalDebatePool.address);
      
      const usdcToken = await contract.usdcToken();
      const oracle = await contract.oracle();
      const platformFee = await contract.PLATFORM_FEE_PERCENTAGE();
      const paused = await contract.paused();

      console.log(`   USDC Token: ${usdcToken}`);
      console.log(`   Oracle: ${oracle}`);
      console.log(`   Platform Fee: ${platformFee}%`);
      console.log(`   Paused: ${paused}`);

      console.log("\n📝 Next Steps:");
      console.log("1. Update your backend with the contract address");
      console.log("2. Fund the oracle wallet for gas fees");
      console.log("3. Test the contract with a sample debate");
      console.log("4. Verify contract on Basescan (optional)");

      console.log("\n🔗 Contract on Basescan:");
      console.log(`   https://sepolia.basescan.org/address/${minimalDebatePool.address}`);
      
      // Save contract address to file
      const fs = require('fs');
      fs.writeFileSync('deployed-address.txt', minimalDebatePool.address);
      console.log(`\n💾 Contract address saved to deployed-address.txt`);
      
    } catch (error) {
      console.error("❌ Verification failed:", error);
    }
  }
};

export default deployMinimalDebatePool;
deployMinimalDebatePool.tags = ["MinimalDebatePool"];

