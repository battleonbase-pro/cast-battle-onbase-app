import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
  
  const owner = await contract.owner();
  console.log("📋 Contract Owner:", owner);
  
  const [signer] = await ethers.getSigners();
  console.log("📝 Current Signer:", signer.address);
  
  const oracle = await contract.oracle();
  console.log("🤖 Oracle Address:", oracle);
  
  console.log("\n🔍 Verification:");
  console.log("   Signer is Owner?", signer.address.toLowerCase() === owner.toLowerCase());
  console.log("   Signer is Oracle?", signer.address.toLowerCase() === oracle.toLowerCase());
  
  // Check USDC balance
  const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
  console.log("\n💰 Contract USDC Balance:", ethers.formatUnits(contractBalance, 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
