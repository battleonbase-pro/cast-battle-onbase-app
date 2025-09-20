const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying BattleToken to Base...");
  
  // Get the contract factory
  const BattleToken = await hre.ethers.getContractFactory("BattleToken");
  
  // Deploy the contract
  console.log("📝 Deploying contract...");
  const battleToken = await BattleToken.deploy();
  
  // Wait for deployment
  await battleToken.waitForDeployment();
  
  // Get contract address
  const address = await battleToken.getAddress();
  console.log("✅ BattleToken deployed to:", address);
  
  // Get deployment info
  const totalSupply = await battleToken.totalSupply();
  const owner = await battleToken.owner();
  
  console.log("📊 Contract Details:");
  console.log("  - Address:", address);
  console.log("  - Total Supply:", hre.ethers.formatEther(totalSupply), "BATTLE");
  console.log("  - Owner:", owner);
  console.log("  - Network:", hre.network.name);
  
  // Verify contract on BaseScan
  if (hre.network.name === "base" || hre.network.name === "baseSepolia") {
    console.log("🔍 Verifying contract on BaseScan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
      console.log("🔗 BaseScan URL:", `https://${hre.network.name === "base" ? "" : "sepolia."}basescan.org/token/${address}`);
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    address: address,
    totalSupply: hre.ethers.formatEther(totalSupply),
    owner: owner,
    deploymentTime: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    `deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to deployments/");
  
  return address;
}

main()
  .then((address) => {
    console.log("🎉 Deployment completed successfully!");
    console.log("📍 Contract Address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });
