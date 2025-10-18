import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const ORACLE_ADDRESS = "0x1DAe81d71810345eEd830782Fd570A871C92919D";
  
  try {
    console.log("🔄 TRANSFERRING CONTRACT OWNERSHIP TO ORACLE");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Oracle Address: ${ORACLE_ADDRESS}`);
    
    // Get contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    // Check current owner
    const currentOwner = await contract.owner();
    console.log(`   Current Owner: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() === ORACLE_ADDRESS.toLowerCase()) {
      console.log("✅ Oracle is already the owner!");
      return;
    }
    
    // Transfer ownership to oracle
    console.log("📝 Transferring ownership to oracle...");
    const tx = await contract.transferOwnership(ORACLE_ADDRESS);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`);
    
    // Verify ownership transfer
    const newOwner = await contract.owner();
    console.log(`✅ New Owner: ${newOwner}`);
    
    if (newOwner.toLowerCase() === ORACLE_ADDRESS.toLowerCase()) {
      console.log("🎉 Ownership successfully transferred to oracle!");
      console.log("✅ Oracle can now create debates!");
    } else {
      console.log("❌ Ownership transfer failed!");
    }
    
  } catch (error) {
    console.error("❌ Ownership transfer failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });