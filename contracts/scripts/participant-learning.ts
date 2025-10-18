import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xD204b546020765994e8B9da58F76D9E85764a059";
  
  try {
    console.log("📚 SMART CONTRACT LEARNING: How Participants Work in DebatePool");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    
    // Get contract instance
    const contract = await ethers.getContractAt("DebatePool", CONTRACT_ADDRESS);
    
    console.log(`\n🏗️ HOW THE CONTRACT STORES PARTICIPANTS:`);
    console.log(`   The contract maintains participants in two ways:`);
    console.log(`   1. In the Debate struct: address[] participants`);
    console.log(`   2. In a mapping: mapping(address => uint256[]) userDebates`);
    
    console.log(`\n📋 DEBATE STRUCT (from IDebatePool.sol):`);
    console.log(`   struct Debate {`);
    console.log(`       uint256 id;`);
    console.log(`       string topic;`);
    console.log(`       uint256 entryFee;`);
    console.log(`       uint256 maxParticipants;`);
    console.log(`       uint256 startTime;`);
    console.log(`       uint256 endTime;`);
    console.log(`       address[] participants;  ← THIS IS THE KEY!`);
    console.log(`       address winner;`);
    console.log(`       bool isActive;`);
    console.log(`       bool isCompleted;`);
    console.log(`   }`);
    
    console.log(`\n🔄 HOW PARTICIPANTS ARE ADDED:`);
    console.log(`   Step 1: Debate is created with EMPTY participants array`);
    console.log(`   Step 2: Users call joinDebate() to become participants`);
    console.log(`   Step 3: Contract adds user to participants array`);
    
    console.log(`\n📝 DEBATE CREATION (createDebate function):`);
    console.log(`   debates[debateId] = Debate({`);
    console.log(`       id: debateId,`);
    console.log(`       topic: topic,`);
    console.log(`       entryFee: entryFee,`);
    console.log(`       maxParticipants: maxParticipants,`);
    console.log(`       startTime: startTime,`);
    console.log(`       endTime: endTime,`);
    console.log(`       participants: new address[](0),  ← EMPTY ARRAY!`);
    console.log(`       winner: address(0),`);
    console.log(`       isActive: true,`);
    console.log(`       isCompleted: false`);
    console.log(`   });`);
    
    console.log(`\n👥 JOINING A DEBATE (joinDebate function):`);
    console.log(`   function joinDebate(uint256 debateId) external {`);
    console.log(`       // Check if debate is full`);
    console.log(`       require(debate.participants.length < debate.maxParticipants);`);
    console.log(`       `);
    console.log(`       // Check if user already participating`);
    console.log(`       require(!_isParticipant(debateId, msg.sender));`);
    console.log(`       `);
    console.log(`       // Transfer USDC entry fee`);
    console.log(`       usdcToken.transferFrom(msg.sender, address(this), debate.entryFee);`);
    console.log(`       `);
    console.log(`       // ADD USER TO PARTICIPANTS ARRAY`);
    console.log(`       debate.participants.push(msg.sender);`);
    console.log(`       userDebates[msg.sender].push(debateId);`);
    console.log(`       `);
    console.log(`       emit ParticipantJoined(debateId, msg.sender);`);
    console.log(`   }`);
    
    console.log(`\n🔍 CHECKING PARTICIPANTS (_isParticipant function):`);
    console.log(`   function _isParticipant(uint256 debateId, address participant) internal view returns (bool) {`);
    console.log(`       address[] memory participants = debates[debateId].participants;`);
    console.log(`       for (uint256 i = 0; i < participants.length; i++) {`);
    console.log(`           if (participants[i] == participant) {`);
    console.log(`               return true;`);
    console.log(`           }`);
    console.log(`       }`);
    console.log(`       return false;`);
    console.log(`   }`);
    
    console.log(`\n📊 YOUR CURRENT DEBATES:`);
    const activeDebates = await contract.getActiveDebates();
    
    for (const debateId of activeDebates) {
      const debate = await contract.getDebate(debateId);
      console.log(`   Debate ${debateId}:`);
      console.log(`     Topic: ${debate.topic}`);
      console.log(`     Participants: ${debate.participants.length}`);
      console.log(`     Max Participants: ${debate.maxParticipants}`);
      console.log(`     Entry Fee: ${ethers.formatUnits(debate.entryFee, 6)} USDC`);
      
      if (debate.participants.length > 0) {
        console.log(`     Participant Addresses:`);
        for (let i = 0; i < debate.participants.length; i++) {
          console.log(`       ${i + 1}. ${debate.participants[i]}`);
        }
      } else {
        console.log(`     ⚠️  NO PARTICIPANTS - This is why declareWinner() fails!`);
      }
    }
    
    console.log(`\n💡 KEY INSIGHTS:`);
    console.log(`   1. ✅ Contract DOES maintain a list of participants`);
    console.log(`   2. ✅ Participants are stored in address[] participants array`);
    console.log(`   3. ✅ Users join by calling joinDebate() and paying USDC`);
    console.log(`   4. ❌ Your debates have 0 participants (empty array)`);
    console.log(`   5. ❌ declareWinner() requires participants.length > 0`);
    console.log(`   6. ❌ declareWinner() requires winner to be in participants array`);
    
    console.log(`\n🔄 THE PARTICIPANT LIFECYCLE:`);
    console.log(`   1. Debate created → participants = [] (empty)`);
    console.log(`   2. Users call joinDebate() → participants.push(userAddress)`);
    console.log(`   3. Debate ends → Oracle calls declareWinner()`);
    console.log(`   4. Winner must be in participants array`);
    console.log(`   5. Contract sets isActive = false, isCompleted = true`);
    
    console.log(`\n🚫 WHY YOUR DEBATES CAN'T BE COMPLETED:`);
    console.log(`   Your debates are stuck at step 1:`);
    console.log(`   - participants = [] (empty array)`);
    console.log(`   - No one called joinDebate()`);
    console.log(`   - declareWinner() fails because participants.length = 0`);
    console.log(`   - isActive never changes from true`);
    console.log(`   - withdrawFunds() is blocked by "active" debates`);
    
    console.log(`\n🎯 SMART CONTRACT LEARNING POINTS:`);
    console.log(`   1. 📦 Contracts store data in state variables`);
    console.log(`   2. 🔄 Functions modify state variables`);
    console.log(`   3. ✅ require() statements enforce business logic`);
    console.log(`   4. 🚫 If requirements fail, function reverts`);
    console.log(`   5. 💰 Users must pay to join (USDC transfer)`);
    console.log(`   6. 🏆 Only participants can win`);
    console.log(`   7. 🔒 Contract logic is immutable once deployed`);
    
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
