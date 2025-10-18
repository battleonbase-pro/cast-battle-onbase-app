import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    console.log("🏆 Oracle: Completing Expired Debates with No Participants");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get oracle private key from environment
    const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY;
    if (!oraclePrivateKey) {
      console.log(`❌ ORACLE_PRIVATE_KEY environment variable not set`);
      console.log(`   Please set ORACLE_PRIVATE_KEY in your .env file`);
      return;
    }
    
    // Create oracle wallet
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org', {
      chainId: 84532,
      name: "base-sepolia"
    });
    
    const oracleWallet = new ethers.Wallet(oraclePrivateKey, provider);
    console.log(`   Oracle Address: ${oracleWallet.address}`);
    
    // Get contract instance with oracle wallet
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    const oracleContract = contract.connect(oracleWallet);
    
    // Verify oracle is the correct one
    const contractOracle = await contract.oracle();
    if (oracleWallet.address.toLowerCase() !== contractOracle.toLowerCase()) {
      console.log(`❌ Oracle address mismatch!`);
      console.log(`   Expected: ${contractOracle}`);
      console.log(`   Got: ${oracleWallet.address}`);
      return;
    }
    
    console.log(`✅ Oracle verified: ${oracleWallet.address}`);
    
    // Get active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    if (activeDebates.length === 0) {
      console.log(`✅ No active debates to complete`);
      return;
    }
    
    console.log(`\n🔍 Analyzing Each Debate:`);
    
    for (const debateId of activeDebates) {
      try {
        const debate = await contract.getDebate(debateId);
        const endTime = new Date(Number(debate.endTime) * 1000);
        const now = new Date();
        const timeLeft = endTime.getTime() - now.getTime();
        const hoursExpired = Math.abs(Math.floor(timeLeft / 1000 / 60 / 60));
        
        console.log(`\n   Debate ${debateId}:`);
        console.log(`     Topic: ${debate.topic}`);
        console.log(`     Participants: ${debate.participants.length}`);
        console.log(`     End Time: ${endTime.toISOString()}`);
        console.log(`     Hours Expired: ${hoursExpired}`);
        console.log(`     Status: ${timeLeft < 0 ? 'EXPIRED' : 'ACTIVE'}`);
        
        // Only process expired debates with no participants
        if (timeLeft < 0 && debate.participants.length === 0) {
          console.log(`     🎯 Processing expired debate with no participants...`);
          
          try {
            // The problem: declareWinner requires the winner to be a participant
            // But our debates have 0 participants, so we can't declare anyone as winner
            
            console.log(`     ❌ Cannot complete: Winner must be a participant`);
            console.log(`     💡 This is the core issue - contract design flaw`);
            console.log(`     🔧 Solutions:`);
            console.log(`       1. Modify contract to allow oracle to complete debates with no participants`);
            console.log(`       2. Add oracle as participant when creating debates`);
            console.log(`       3. Create emergency completion function`);
            
            // Let's try a different approach - maybe we can add the oracle as a participant first
            // But that would require modifying the contract or having a special function
            
            console.log(`     🚫 Cannot proceed without contract modification`);
            
          } catch (error) {
            console.log(`     ❌ Error: ${error.message}`);
          }
        } else if (timeLeft >= 0) {
          console.log(`     ⏳ Debate still active, not processing`);
        } else if (debate.participants.length > 0) {
          console.log(`     👥 Debate has participants, using normal completion process`);
          
          // For debates with participants, we can complete them normally
          try {
            const winner = debate.participants[0]; // Use first participant as winner
            console.log(`     🏆 Declaring winner: ${winner}`);
            
            // Create winner result
            const winnerResult = {
              debateId: debateId,
              winner: winner,
              timestamp: Math.floor(Date.now() / 1000),
              signature: "0x" // We'll sign this
            };
            
            // Sign the result
            const domain = {
              name: 'DebatePool',
              version: '1',
              chainId: 84532,
              verifyingContract: CONTRACT_ADDRESS
            };
            
            const types = {
              WinnerResult: [
                { name: 'debateId', type: 'uint256' },
                { name: 'winner', type: 'address' },
                { name: 'timestamp', type: 'uint256' }
              ]
            };
            
            const signature = await oracleWallet.signTypedData(domain, types, winnerResult);
            winnerResult.signature = signature;
            
            // Declare winner
            const tx = await oracleContract.declareWinner(winnerResult);
            console.log(`     ✅ Debate ${debateId} completed! Transaction: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`     📝 Confirmed in block: ${receipt?.blockNumber}`);
            
          } catch (error) {
            console.log(`     ❌ Failed to complete debate ${debateId}: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing debate ${debateId}: ${error.message}`);
      }
    }
    
    // Check final status
    console.log(`\n🔍 Final Status Check:`);
    const finalActiveDebates = await contract.getActiveDebates();
    console.log(`   Remaining Active Debates: ${finalActiveDebates.length}`);
    
    if (finalActiveDebates.length === 0) {
      console.log(`\n✅ All debates completed! Now you can withdraw funds.`);
      
      // Try to withdraw funds
      try {
        console.log(`\n💸 Attempting to withdraw funds...`);
        const withdrawTx = await contract.withdrawFunds();
        console.log(`   Withdrawal sent: ${withdrawTx.hash}`);
        
        const withdrawReceipt = await withdrawTx.wait();
        console.log(`   Withdrawal confirmed in block: ${withdrawReceipt?.blockNumber}`);
        
        console.log(`\n🎉 SUCCESS! Funds withdrawn successfully!`);
        
      } catch (error) {
        console.log(`❌ Withdrawal still failed: ${error.message}`);
      }
    } else {
      console.log(`\n⚠️  Some debates still active. Check the errors above.`);
      
      // Show which debates are still active
      for (const debateId of finalActiveDebates) {
        const debate = await contract.getDebate(debateId);
        console.log(`   Debate ${debateId}: ${debate.participants.length} participants`);
      }
    }
    
  } catch (error) {
    console.error("❌ Oracle script failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });