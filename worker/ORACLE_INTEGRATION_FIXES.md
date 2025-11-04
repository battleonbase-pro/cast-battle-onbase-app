# Oracle Integration - Recommended Fixes

## Quick Fixes to Apply

### Fix 1: Remove Debate ID Fallback (High Priority)

**Current Code** (`debate-oracle.ts:155`):
```typescript
const debateId = battle.debateId || parseInt(battleId.replace(/-/g, ''), 16) % 1000000;
```

**Problem**: Unreliable fallback that could cause collisions

**Fix**:
```typescript
// Require debateId to be set
if (!battle.debateId) {
  throw new Error(
    `Battle ${battleId} must have debateId set in database. ` +
    `Cannot distribute winner without on-chain debate ID.`
  );
}
const debateId = battle.debateId;
```

### Fix 2: Add Pre-Flight Completion Check (High Priority)

**Add Before** `distributeWinner()` call (`debate-oracle.ts:179`):

```typescript
// Check if debate is already completed on-chain
try {
  const isCompleted = await this.isDebateCompleted(debateId);
  if (isCompleted) {
    console.log(`⚠️ Debate ${debateId} already completed on-chain, skipping distribution`);
    console.log(`   Battle ${battleId} winner distribution was already processed`);
    return; // Skip - no gas wasted
  }
} catch (error) {
  console.error(`⚠️ Failed to check debate completion status:`, error);
  // Continue anyway - contract will revert if already completed
}

// Check contract balance before distribution
try {
  const contractBalance = await this.getContractBalance();
  const requiredBalance = parseFloat(ethers.formatUnits(winnerPrize, 6));
  const availableBalance = parseFloat(contractBalance);
  
  if (availableBalance < requiredBalance) {
    throw new Error(
      `Insufficient contract balance. ` +
      `Required: ${requiredBalance} USDC, ` +
      `Available: ${availableBalance} USDC`
    );
  }
  
  console.log(`💰 Contract balance check: ${availableBalance} USDC available`);
} catch (error) {
  console.error(`⚠️ Failed to check contract balance:`, error);
  // Continue anyway - contract will revert if insufficient
}
```

### Fix 3: Add Retry Logic (Medium Priority)

**Wrap** `distributeWinner()` call with retry:

```typescript
// Distribute winner prize with retry logic
const MAX_RETRIES = 3;
let lastError: Error | null = null;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    const txHash = await this.distributeWinner(debateId, winnerAddress, winnerPrize);
    console.log(`✅ Battle ${battleId} processed successfully`);
    console.log(`   Transaction: ${txHash}`);
    return; // Success - exit function
  } catch (error: any) {
    lastError = error;
    
    // Don't retry on certain errors
    if (error.message?.includes('Already completed')) {
      console.log(`⚠️ Debate ${debateId} already completed, skipping`);
      return; // Don't retry - already done
    }
    
    if (error.message?.includes('Not oracle')) {
      throw error; // Don't retry - configuration issue
    }
    
    // Retry on network errors
    if (attempt < MAX_RETRIES) {
      const delay = 1000 * attempt; // Exponential backoff
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// All retries failed
throw new Error(
  `Failed to distribute winner after ${MAX_RETRIES} attempts: ${lastError?.message}`
);
```

---

## Complete Updated Function

Here's the complete updated `processBattleCompletion()` with all fixes:

```typescript
async processBattleCompletion(
  battleId: string,
  winnerAddress: string,
  participantCount: number
): Promise<void> {
  try {
    console.log(`🔄 Processing battle completion for battle ${battleId}`);
    console.log(`   Winner: ${winnerAddress}`);
    console.log(`   Participants: ${participantCount}`);

    // Get battle details from database
    const battle = await prisma.battle.findUnique({
      where: { id: battleId }
    });

    if (!battle) {
      throw new Error(`Battle ${battleId} not found`);
    }

    if (battle.status !== 'COMPLETED') {
      throw new Error(`Battle ${battleId} is not completed`);
    }

    // FIX 1: Require debateId (no fallback)
    if (!battle.debateId) {
      throw new Error(
        `Battle ${battleId} must have debateId set in database. ` +
        `Cannot distribute winner without on-chain debate ID.`
      );
    }
    const debateId = battle.debateId;

    // Calculate total collected: each participant paid 1 USDC
    const ENTRY_FEE_USDC = 1;
    const totalCollected = participantCount * ENTRY_FEE_USDC;
    
    // Calculate winner prize: 80% of total collected
    const winnerPrizePercentage = 0.8;
    const winnerPrizeUSDC = totalCollected * winnerPrizePercentage;
    
    // Convert to USDC with 6 decimals
    const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);

    console.log(`💰 Prize calculation:`);
    console.log(`   Total collected: ${totalCollected} USDC`);
    console.log(`   Winner prize (80%): ${winnerPrizeUSDC} USDC`);
    console.log(`   Platform fee (20%): ${totalCollected - winnerPrizeUSDC} USDC`);
    console.log(`🔗 Using debate ID: ${debateId}`);

    // FIX 2: Pre-flight checks
    // Check if already completed
    try {
      const isCompleted = await this.isDebateCompleted(debateId);
      if (isCompleted) {
        console.log(`⚠️ Debate ${debateId} already completed on-chain, skipping distribution`);
        return;
      }
    } catch (error) {
      console.error(`⚠️ Failed to check debate completion status:`, error);
      // Continue anyway - contract will revert if already completed
    }

    // Check contract balance
    try {
      const contractBalance = await this.getContractBalance();
      const requiredBalance = parseFloat(ethers.formatUnits(winnerPrize, 6));
      const availableBalance = parseFloat(contractBalance);
      
      if (availableBalance < requiredBalance) {
        throw new Error(
          `Insufficient contract balance. ` +
          `Required: ${requiredBalance} USDC, ` +
          `Available: ${availableBalance} USDC`
        );
      }
      
      console.log(`💰 Contract balance: ${availableBalance} USDC (sufficient)`);
    } catch (error) {
      console.error(`⚠️ Failed to check contract balance:`, error);
      // Continue anyway - contract will revert if insufficient
    }

    // FIX 3: Distribute with retry logic
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const txHash = await this.distributeWinner(debateId, winnerAddress, winnerPrize);
        console.log(`✅ Battle ${battleId} processed successfully`);
        console.log(`   Transaction: ${txHash}`);
        return; // Success
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('Already completed')) {
          console.log(`⚠️ Debate ${debateId} already completed, skipping`);
          return;
        }
        
        if (error.message?.includes('Not oracle')) {
          throw error; // Configuration issue - don't retry
        }
        
        // Retry on network errors
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * attempt;
          console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to distribute winner after ${MAX_RETRIES} attempts: ${lastError?.message}`
    );

  } catch (error) {
    console.error(`❌ Failed to process battle ${battleId}:`, error);
    throw error;
  }
}
```

---

## Implementation Steps

1. **Update `debate-oracle.ts`**:
   - Remove debate ID fallback
   - Add pre-flight checks
   - Add retry logic

2. **Update Database Schema** (if needed):
   - Ensure `battle.debateId` is always set when creating battles
   - Add migration if needed

3. **Test**:
   - Test with existing completed debate (should skip)
   - Test with insufficient balance (should error clearly)
   - Test with network failure (should retry)

4. **Monitor**:
   - Watch logs for pre-flight check results
   - Monitor retry attempts
   - Track gas savings from pre-flight checks

