import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const DEV_WALLET = "0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7";
  
  try {
    console.log("🔍 Checking DebatePool Contract Status");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Dev Wallet: ${DEV_WALLET}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [signer] = await ethers.getSigners();
    
    console.log(`   Current Signer: ${signer.address}`);
    
    // Check contract owner
    const contractOwner = await contract.owner();
    console.log(`   Contract Owner: ${contractOwner}`);
    
    // Check if signer is owner
    const isOwner = signer.address.toLowerCase() === contractOwner.toLowerCase();
    console.log(`   Is Signer Owner: ${isOwner ? '✅ Yes' : '❌ No'}`);
    
    // Check USDC balance in contract
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    // Check dev wallet balance
    const devBalance = await usdcContract.balanceOf(DEV_WALLET);
    const devBalanceFormatted = ethers.formatUnits(devBalance, 6);
    
    console.log(`   Dev Wallet USDC Balance: ${devBalanceFormatted} USDC`);
    
    // Check active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    if (activeDebates.length > 0) {
      console.log(`   Active Debate IDs: ${activeDebates.join(', ')}`);
    }
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Contract has ${contractBalanceFormatted} USDC`);
    console.log(`   Owner is ${contractOwner}`);
    console.log(`   Your address is ${signer.address}`);
    
    if (!isOwner) {
      console.log(`\n⚠️  To withdraw funds, you need to:`);
      console.log(`   1. Use the owner's private key (${contractOwner})`);
      console.log(`   2. OR transfer ownership to your address first`);
    } else {
      console.log(`\n✅ You can withdraw funds! Run the withdrawal script.`);
    }
    
  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
