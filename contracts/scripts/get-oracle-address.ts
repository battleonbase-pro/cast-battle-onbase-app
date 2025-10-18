import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    console.log("🔍 GETTING ORACLE ADDRESS FROM CONTRACT");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    // Get oracle address
    const oracleAddress = await contract.oracle();
    console.log(`   Oracle Address: ${oracleAddress}`);
    
    // Get owner address
    const ownerAddress = await contract.owner();
    console.log(`   Owner Address: ${ownerAddress}`);
    
    console.log("\n📋 SUMMARY:");
    console.log(`   Oracle: ${oracleAddress}`);
    console.log(`   Owner: ${ownerAddress}`);
    
    if (oracleAddress.toLowerCase() === ownerAddress.toLowerCase()) {
      console.log("✅ Oracle is already the owner!");
    } else {
      console.log("⚠️ Oracle is not the owner - need to transfer ownership");
    }
    
  } catch (error) {
    console.error("❌ Failed to get oracle address:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
