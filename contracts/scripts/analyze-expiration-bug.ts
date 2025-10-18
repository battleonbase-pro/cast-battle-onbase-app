import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    console.log("🔍 Analyzing Why Debates Are Still Active After Expiration");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get the contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    // Get active debates
    const activeDebates = await contract.getActiveDebates();
    console.log(`   Active Debates: ${activeDebates.length}`);
    
    console.log(`\n🔍 Problem Analysis:`);
    console.log(`   The issue is in the contract's design:`);
    console.log(`   1. Debates are created with isActive = true`);
    console.log(`   2. isActive is only set to false when declareWinner() is called`);
    console.log(`   3. declareWinner() requires participants and oracle signature`);
    console.log(`   4. getActiveDebates() only checks isActive flag, not time`);
    console.log(`   5. There's NO automatic expiration mechanism!`);
    
    console.log(`\n📝 Current Contract Logic:`);
    console.log(`   ✅ Debate created: isActive = true`);
    console.log(`   ❌ Time expires: isActive still = true (NO CHANGE)`);
    console.log(`   ❌ getActiveDebates(): returns debates where isActive = true`);
    console.log(`   ❌ withdrawFunds(): blocked by active debates`);
    
    console.log(`\n🐛 The Bug:`);
    console.log(`   The contract has NO automatic expiration mechanism!`);
    console.log(`   Debates remain "active" forever until manually completed.`);
    
    // Check each debate's details
    console.log(`\n📊 Debate Details:`);
    for (const debateId of activeDebates) {
      try {
        const debate = await contract.getDebate(debateId);
        const endTime = new Date(Number(debate.endTime) * 1000);
        const now = new Date();
        const timeLeft = endTime.getTime() - now.getTime();
        const hoursExpired = Math.abs(Math.floor(timeLeft / 1000 / 60 / 60));
        
        console.log(`   Debate ${debateId}:`);
        console.log(`     Topic: ${debate.topic}`);
        console.log(`     Participants: ${debate.participants.length}`);
        console.log(`     End Time: ${endTime.toISOString()}`);
        console.log(`     Is Active: ${debate.isActive}`);
        console.log(`     Is Completed: ${debate.isCompleted}`);
        console.log(`     Hours Expired: ${hoursExpired}`);
        console.log(`     Status: ${timeLeft < 0 ? 'EXPIRED' : 'ACTIVE'}`);
      } catch (error) {
        console.log(`   Error getting debate ${debateId}: ${error.message}`);
      }
    }
    
    console.log(`\n💡 Why This Happens:`);
    console.log(`   1. Contract was designed for debates with participants`);
    console.log(`   2. No participants = no winner to declare`);
    console.log(`   3. No winner declared = isActive never changes`);
    console.log(`   4. No automatic expiration = debates stay active forever`);
    
    console.log(`\n🔧 Solutions:`);
    
    console.log(`\n🔧 Solution 1: Fix the Contract (Best)`);
    console.log(`   Modify getActiveDebates() to check time:`);
    console.log(`   Check both isActive AND not expired`);
    
    console.log(`\n🔧 Solution 2: Add Auto-Expiration Function`);
    console.log(`   Add a function to automatically expire debates`);
    console.log(`   Only for debates with 0 participants and expired time`);
    
    console.log(`\n🔧 Solution 3: Emergency Withdrawal Override`);
    console.log(`   Modify withdrawFunds() to ignore expired debates`);
    console.log(`   Only check for truly active debates (not expired)`);
    
    console.log(`\n🎯 Immediate Fix:`);
    console.log(`   Since you can't modify the deployed contract:`);
    console.log(`   1. Use oracle private key to complete debates`);
    console.log(`   2. Or deploy a new contract with proper expiration logic`);
    console.log(`   3. Or add emergency withdrawal function`);
    
    console.log(`\n📋 Root Cause:`);
    console.log(`   The contract was designed assuming:`);
    console.log(`   - Debates would always have participants`);
    console.log(`   - Oracle would always complete debates`);
    console.log(`   - No need for automatic expiration`);
    console.log(`   `);
    console.log(`   But in reality:`);
    console.log(`   - Debates can have 0 participants`);
    console.log(`   - Oracle might not complete them`);
    console.log(`   - Debates expire but stay "active"`);
    
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