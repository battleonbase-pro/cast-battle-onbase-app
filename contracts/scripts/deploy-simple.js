const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying DebatePool to Base Sepolia...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Contract addresses
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || "0x0000000000000000000000000000000000000000";

  if (ORACLE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Please set ORACLE_ADDRESS in .env file");
    process.exit(1);
  }

  console.log("📋 Deployment Configuration:");
  console.log(`   USDC Address: ${USDC_ADDRESS}`);
  console.log(`   Oracle Address: ${ORACLE_ADDRESS}`);
  console.log(`   Deployer: ${deployer.address}`);

  // Deploy using raw transaction
  try {
    console.log("📤 Deploying contract...");
    
    // Get contract factory
    const DebatePoolFactory = await hre.ethers.getContractFactory("DebatePool");
    
    // Create deployment transaction
    const deploymentTx = await DebatePoolFactory.getDeployTransaction(USDC_ADDRESS, ORACLE_ADDRESS);
    
    // Send transaction
    const tx = await deployer.sendTransaction(deploymentTx);
    console.log("Transaction sent:", tx.hash);
    
    // Wait for deployment
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Get contract address from receipt
    const contractAddress = receipt.contractAddress;
    
    console.log("✅ DebatePool deployed successfully!");
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

    // Verify deployment by calling a view function
    console.log("\n🔍 Verifying deployment...");
    const contract = await hre.ethers.getContractAt("DebatePool", contractAddress);
    
    const usdcToken = await contract.usdcToken();
    const oracle = await contract.oracle();
    const platformFee = await contract.PLATFORM_FEE_PERCENTAGE();

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
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });