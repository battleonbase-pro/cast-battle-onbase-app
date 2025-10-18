import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployEmergencyWithdrawer: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("🚨 Deploying EmergencyUSDCWithdrawer to Base Sepolia...");
  console.log(`Deployer: ${deployer}`);

  // Base Sepolia USDC address
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Existing DebatePool contract address
  const DEBATE_POOL_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";

  console.log("📋 Deployment Configuration:");
  console.log(`   USDC Address: ${USDC_ADDRESS}`);
  console.log(`   DebatePool Address: ${DEBATE_POOL_ADDRESS}`);

  // Deploy the emergency withdrawer contract
  const emergencyWithdrawer = await deploy("EmergencyUSDCWithdrawer", {
    from: deployer,
    args: [USDC_ADDRESS, DEBATE_POOL_ADDRESS],
    log: true,
    waitConfirmations: 1,
  });

  console.log("✅ EmergencyUSDCWithdrawer deployed successfully!");
  console.log(`   Contract Address: ${emergencyWithdrawer.address}`);
  console.log(`   Transaction Hash: ${emergencyWithdrawer.transactionHash}`);
  
  // Save the contract address to environment
  console.log(`\n📝 Add this to your .env.local:`);
  console.log(`EMERGENCY_WITHDRAWER_ADDRESS=${emergencyWithdrawer.address}`);
  
  console.log(`\n⚠️  Note: This contract can only withdraw USDC if:`);
  console.log(`   1. The DebatePool contract is modified to allow it`);
  console.log(`   2. Or you have the oracle private key to complete debates`);
  console.log(`   3. Or you modify DebatePool to add emergency withdrawal`);
  
  console.log(`\n🔧 Next Steps:`);
  console.log(`   1. Modify DebatePool to add emergency withdrawal function`);
  console.log(`   2. Or use oracle private key to complete debates`);
  console.log(`   3. Then call emergencyWithdraw() on this contract`);
};

export default deployEmergencyWithdrawer;
deployEmergencyWithdrawer.tags = ["EmergencyUSDCWithdrawer"];
