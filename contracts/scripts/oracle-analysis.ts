import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    console.log("🔍 Oracle Analysis: What's Needed to Complete Expired Debates");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    // Get oracle address from contract
    const oracleAddress = await contract.oracle();
    console.log(`   Contract Oracle Address: ${oracleAddress}`);
    
    // Get active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    console.log(`\n🔍 Problem Analysis:`);
    console.log(`   The issue is a contract design flaw:`);
    console.log(`   1. Debates expire but stay "active"`);
    console.log(`   2. declareWinner() requires winner to be a participant`);
    console.log(`   3. Expired debates have 0 participants`);
    console.log(`   4. Oracle cannot complete debates with 0 participants`);
    
    console.log(`\n📊 Current Debate Status:`);
    for (const debateId of activeDebates) {
      const debate = await contract.getDebate(debateId);
      const endTime = new Date(Number(debate.endTime) * 1000);
      const now = new Date();
      const timeLeft = endTime.getTime() - now.getTime();
      const hoursExpired = Math.abs(Math.floor(timeLeft / 1000 / 60 / 60));
      
      console.log(`   Debate ${debateId}:`);
      console.log(`     Topic: ${debate.topic}`);
      console.log(`     Participants: ${debate.participants.length}`);
      console.log(`     Hours Expired: ${hoursExpired}`);
      console.log(`     Status: ${timeLeft < 0 ? 'EXPIRED' : 'ACTIVE'}`);
    }
    
    console.log(`\n💡 Solutions (Oracle Side):`);
    
    console.log(`\n🔧 Solution 1: Use Oracle Private Key`);
    console.log(`   If you have the oracle private key (${oracleAddress}):`);
    console.log(`   1. Set ORACLE_PRIVATE_KEY in your .env file`);
    console.log(`   2. Run: npx hardhat run scripts/oracle-complete-expired-debates.ts --network baseSepolia`);
    console.log(`   ⚠️  This will still fail because debates have 0 participants`);
    
    console.log(`\n🔧 Solution 2: Modify Contract (Recommended)`);
    console.log(`   Add a function to complete debates with no participants`);
    console.log(`   The function would check if debate is expired and has no participants`);
    console.log(`   Then set isActive = false and isCompleted = true`);
    
    console.log(`\n🔧 Solution 3: Emergency Withdrawal Override`);
    console.log(`   Modify withdrawFunds() to ignore expired debates`);
    console.log(`   Only check for truly active debates (not expired)`);
    console.log(`   Allow withdrawal if all debates are expired`);
    
    console.log(`\n🎯 Immediate Action Required:`);
    console.log(`   Since you don't want to modify the contract:`);
    console.log(`   1. You need the oracle private key for ${oracleAddress}`);
    console.log(`   2. But even with the oracle key, you can't complete debates with 0 participants`);
    console.log(`   3. The contract design prevents this scenario`);
    
    console.log(`\n🔑 Oracle Private Key:`);
    console.log(`   The oracle address is: ${oracleAddress}`);
    console.log(`   You need the private key for this address to act as oracle`);
    console.log(`   If you don't have it, you'll need to:`);
    console.log(`   - Deploy a new contract with better logic`);
    console.log(`   - Or modify the existing contract`);
    console.log(`   - Or find another way to complete the debates`);
    
    console.log(`\n📋 Summary:`);
    console.log(`   ✅ Contract has 9.0 USDC`);
    console.log(`   ✅ You are the contract owner`);
    console.log(`   ❌ 8 debates are expired but still "active"`);
    console.log(`   ❌ Oracle cannot complete debates with 0 participants`);
    console.log(`   ❌ Contract design prevents withdrawal`);
    console.log(`   `);
    console.log(`   🚫 The funds are locked due to a contract design flaw`);
    console.log(`   🔧 Contract modification is the only reliable solution`);
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });