import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  console.log("🔍 Verifying DebatePool contract deployment...");
  console.log(`Contract Address: ${contractAddress}`);
  
  try {
    const contract = await ethers.getContractAt("DebatePool", contractAddress);
    
    console.log("\n📋 Contract Verification:");
    
    const usdcToken = await contract.usdcToken();
    const oracle = await contract.oracle();
    const platformFee = await contract.PLATFORM_FEE_PERCENTAGE();
    const owner = await contract.owner();

    console.log(`✅ USDC Token: ${usdcToken}`);
    console.log(`✅ Oracle: ${oracle}`);
    console.log(`✅ Platform Fee: ${platformFee}%`);
    console.log(`✅ Owner: ${owner}`);

    console.log("\n🎉 Contract verification successful!");
    console.log("\n📝 Next Steps:");
    console.log("1. Update your backend with the contract address");
    console.log("2. Fund the oracle wallet for gas fees");
    console.log("3. Test the contract with a sample debate");
    console.log("4. Verify contract on Basescan (optional)");

    console.log("\n🔗 Contract on Basescan:");
    console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
