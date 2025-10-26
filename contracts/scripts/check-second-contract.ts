import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271";
  
  try {
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    const owner = await contract.owner();
    console.log("📋 Contract Owner:", owner);
    
    const [signer] = await ethers.getSigners();
    console.log("📝 Current Signer:", signer.address);
    
    const oracle = await contract.oracle();
    console.log("🤖 Oracle Address:", oracle);
    
    console.log("\n🔍 Verification:");
    console.log("   Signer is Owner?", signer.address.toLowerCase() === owner.toLowerCase());
    
    // Check USDC balance
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541onlyC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS).catch(() => 0n);
    console.log("\n💰 Contract USDC Balance:", ethers.formatUnits(contractBalance, 6), "USDC");
    
    // If signer is owner, can withdraw
    if (signer.address.toLowerCase() === owner.toLowerCase() && contractBalance > 0n) {
      console.log("\n✅ YOU CAN WITHDRAW from this contract!");
      console.log("   Run: npx hardhat run scripts/simple-withdraw-second.ts --network baseSepolia");
    }
    
  } catch (error: any) {
    if (error.message.includes("call revert")) {
      console.log("❌ Contract doesn't exist or is not deployed at this address");
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
