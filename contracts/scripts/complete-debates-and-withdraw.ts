import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  const DEV_WALLET = "0x1a33d3440c62a4586380ad5269f1f7e55f4c6af7";
  
  try {
    console.log("🏆 Completing Expired Debates and Withdrawing Funds");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Dev Wallet: ${DEV_WALLET}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const [signer] = await ethers.getSigners();
    
    console.log(`   Current Signer: ${signer.address}`);
    
    // Check contract owner
    const contractOwner = await contract.owner();
    console.log(`   Contract Owner: ${contractOwner}`);
    
    // Check USDC balance in contract
    const usdcContract = await ethers.getContractAt("IERC20", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const contractBalance = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const contractBalanceFormatted = ethers.formatUnits(contractBalance, 6);
    
    console.log(`   Contract USDC Balance: ${contractBalanceFormatted} USDC`);
    
    // Get active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    if (activeDebates.length === 0) {
      console.log(`\n✅ No active debates. Attempting direct withdrawal...`);
      
      try {
        const withdrawTx = await contract.withdrawFunds();
        console.log(`   Withdrawal sent: ${withdrawTx.hash}`);
        
        const withdrawReceipt = await withdrawTx.wait();
        console.log(`   Withdrawal confirmed in block: ${withdrawReceipt?.blockNumber}`);
        
        console.log(`\n✅ Withdrawal Complete!`);
        return;
      } catch (error) {
        console.log(`❌ Direct withdrawal failed: ${error.message}`);
      }
    }
    
    // Check if we can complete the debates
    console.log(`\n🏆 Attempting to complete expired debates...`);
    
    // First, let's check if we can call declareWinner
    // We need to check what the oracle address is
    try {
      const oracleAddress = await contract.oracle();
      console.log(`   Oracle Address: ${oracleAddress}`);
      
      if (oracleAddress.toLowerCase() !== signer.address.toLowerCase()) {
        console.log(`❌ Cannot complete debates: Current signer is not the oracle`);
        console.log(`   Oracle: ${oracleAddress}`);
        console.log(`   Signer: ${signer.address}`);
        console.log(`\n💡 Solutions:`);
        console.log(`   1. Use the oracle's private key to sign transactions`);
        console.log(`   2. Or modify the contract to allow owner to complete debates`);
        console.log(`   3. Or wait for the oracle to complete the debates`);
        
        // Let's try a different approach - maybe we can modify the contract
        console.log(`\n🔧 Alternative approach: Let's check if there's a way to force completion...`);
        
        // Check if the contract has any emergency functions
        console.log(`\n💡 The issue is that only the oracle can complete debates.`);
        console.log(`   Since the debates have no participants, there's no winner to declare.`);
        console.log(`   The contract might need to be modified to handle this case.`);
        
        return;
      }
      
      // If we are the oracle, try to complete the debates
      console.log(`✅ Current signer is the oracle. Attempting to complete debates...`);
      
      for (const debateId of activeDebates) {
        try {
          const debate = await contract.getDebate(debateId);
          console.log(`\n   Completing Debate ${debateId}:`);
          console.log(`     Topic: ${debate.topic}`);
          console.log(`     Participants: ${debate.participants.length}`);
          
          if (debate.participants.length === 0) {
            console.log(`     ⚠️  No participants - cannot declare winner`);
            continue;
          }
          
          // If there are participants, declare the first one as winner
          const winner = debate.participants[0];
          console.log(`     Declaring winner: ${winner}`);
          
          // Create a dummy signature (this won't work without proper oracle signing)
          const dummySignature = "0x" + "0".repeat(130);
          
          const winnerResult = {
            debateId: debateId,
            winner: winner,
            timestamp: Math.floor(Date.now() / 1000),
            signature: dummySignature
          };
          
          const declareTx = await contract.declareWinner(winnerResult);
          console.log(`     Winner declaration sent: ${declareTx.hash}`);
          
          const declareReceipt = await declareTx.wait();
          console.log(`     Winner declared in block: ${declareReceipt?.blockNumber}`);
          
        } catch (error) {
          console.log(`     ❌ Failed to complete debate ${debateId}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error checking oracle: ${error.message}`);
    }
    
    // After completing debates, try withdrawal again
    console.log(`\n💸 Attempting withdrawal after completing debates...`);
    
    try {
      const withdrawTx = await contract.withdrawFunds();
      console.log(`   Withdrawal sent: ${withdrawTx.hash}`);
      
      const withdrawReceipt = await withdrawTx.wait();
      console.log(`   Withdrawal confirmed in block: ${withdrawReceipt?.blockNumber}`);
      
      console.log(`\n✅ Withdrawal Complete!`);
      
      // Check final balances
      const contractBalanceAfter = await usdcContract.balanceOf(CONTRACT_ADDRESS);
      const contractBalanceAfterFormatted = ethers.formatUnits(contractBalanceAfter, 6);
      
      const devBalanceAfter = await usdcContract.balanceOf(DEV_WALLET);
      const devBalanceAfterFormatted = ethers.formatUnits(devBalanceAfter, 6);
      
      console.log(`\n🔍 Final Balances:`);
      console.log(`   Contract USDC Balance: ${contractBalanceAfterFormatted} USDC`);
      console.log(`   Dev Wallet USDC Balance: ${devBalanceAfterFormatted} USDC`);
      
    } catch (error) {
      console.log(`❌ Withdrawal still failed: ${error.message}`);
      
      console.log(`\n🔧 Final Solution:`);
      console.log(`   The contract appears to have additional restrictions on withdrawal.`);
      console.log(`   You may need to:`);
      console.log(`   1. Modify the contract to add an emergency withdrawal function`);
      console.log(`   2. Or wait for the oracle to complete all debates`);
      console.log(`   3. Or deploy a new contract with different withdrawal logic`);
    }
    
  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
