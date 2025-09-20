import { ethers } from "hardhat";

async function main() {
  console.log('🚀 Deploying Battle Contract...\n');

  // Get the contract factory
  const BattleToken = await ethers.getContractFactory("BattleToken");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Define token distribution
  const totalSupply = ethers.parseEther("1000000000"); // 1 billion tokens
  const battleRewards = ethers.parseEther("400000000"); // 40% for battle rewards
  const communityTreasury = ethers.parseEther("250000000"); // 25% for community
  const teamAllocation = ethers.parseEther("200000000"); // 20% for team
  const projectTreasury = ethers.parseEther("150000000"); // 15% for project treasury

  // Deploy the contract
  console.log('\n📦 Deploying BattleToken contract...');
  const battleToken = await BattleToken.deploy(
    totalSupply,
    battleRewards,
    communityTreasury,
    teamAllocation,
    projectTreasury
  );

  await battleToken.waitForDeployment();
  const contractAddress = await battleToken.getAddress();

  console.log('\n✅ BattleToken deployed successfully!');
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Network: ${network.name}`);
  console.log(`⛽ Gas Used: ${(await battleToken.deploymentTransaction())?.gasLimit?.toString()}`);

  // Display token distribution
  console.log('\n💰 Token Distribution:');
  console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} BATTLE`);
  console.log(`   Battle Rewards: ${ethers.formatEther(battleRewards)} BATTLE (40%)`);
  console.log(`   Community Treasury: ${ethers.formatEther(communityTreasury)} BATTLE (25%)`);
  console.log(`   Team Allocation: ${ethers.formatEther(teamAllocation)} BATTLE (20%)`);
  console.log(`   Project Treasury: ${ethers.formatEther(projectTreasury)} BATTLE (15%)`);

  // Verify contract (if on Base mainnet)
  if (network.name === 'base') {
    console.log('\n🔍 Verifying contract on BaseScan...');
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          totalSupply,
          battleRewards,
          communityTreasury,
          teamAllocation,
          projectTreasury
        ],
      });
      console.log('✅ Contract verified successfully!');
    } catch (error) {
      console.log('⚠️ Contract verification failed:', error.message);
      console.log('   You can verify manually later using:');
      console.log(`   npx hardhat verify --network base ${contractAddress} ${totalSupply} ${battleRewards} ${communityTreasury} ${teamAllocation} ${projectTreasury}`);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    deployer: deployer.address,
    totalSupply: ethers.formatEther(totalSupply),
    distribution: {
      battleRewards: ethers.formatEther(battleRewards),
      communityTreasury: ethers.formatEther(communityTreasury),
      teamAllocation: ethers.formatEther(teamAllocation),
      projectTreasury: ethers.formatEther(projectTreasury)
    },
    timestamp: new Date().toISOString(),
    transactionHash: (await battleToken.deploymentTransaction())?.hash
  };

  console.log('\n📋 Deployment Summary:');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log('\n🎯 Next Steps:');
  console.log('   1. Update .env with contract address:');
  console.log(`      NEXT_PUBLIC_BATTLE_TOKEN_ADDRESS=${contractAddress}`);
  console.log('   2. Test token functionality: npm run dev');
  console.log('   3. Deploy frontend: npm run build');
  console.log('   4. Set up token distribution wallets');

  console.log('\n🔗 Useful Links:');
  if (network.name === 'base') {
    console.log(`   BaseScan: https://basescan.org/address/${contractAddress}`);
  } else if (network.name === 'baseSepolia') {
    console.log(`   BaseScan Testnet: https://sepolia.basescan.org/address/${contractAddress}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
