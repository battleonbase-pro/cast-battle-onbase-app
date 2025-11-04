# Backend Integration Update for MinimalDebatePool

## Overview

The backend has been updated to work with the new `MinimalDebatePool` contract, which moves most functionality off-chain and only keeps essential trustless operations on-chain.

## Key Changes

### 1. **Debate Creation** (Removed)
- **Before**: `OnChainDebateService.createDebate()` created debates on-chain
- **After**: Debates are created only in the backend database (no on-chain creation)
- **Reason**: `MinimalDebatePool` doesn't have `createDebate()` - it's designed to be minimal

### 2. **Winner Distribution** (Updated)
- **Before**: `DebateOracle.declareWinner()` used old signature format
- **After**: `DebateOracle.distributeWinner()` uses new EIP-712 signature format
- **New Signature Format**:
  ```typescript
  WinnerDistribution {
    debateId: uint256
    winner: address
    winnerPrize: uint256  // NEW: Prize amount included in signature
  }
  ```
- **Domain**: Changed from `'DebatePool'` to `'MinimalDebatePool'`

### 3. **Prize Calculation** (Added)
- **Location**: `DebateOracle.processBattleCompletion()`
- **Calculation**:
  - Total collected = `participantCount * 1 USDC`
  - Winner prize = `totalCollected * 0.8` (80%)
  - Platform fee = `totalCollected * 0.2` (20%) - calculated by contract
- **Implementation**: Backend calculates `winnerPrize` and passes it to contract

### 4. **Contract ABI Updates**
- **Removed Functions**:
  - `createDebate()`
  - `getDebate()`
  - `getActiveDebates()`
  - `getUserDebates()`
  - `getUserPoints()`
  - `isParticipant()`
  - `declareWinner()` (old version)
- **New Functions**:
  - `distributeWinner(uint256 debateId, address winner, uint256 winnerPrize, bytes memory signature)`
  - `isDebateCompleted(uint256 debateId)`
  - `getPlatformFees(uint256 debateId)`
  - `getContractBalance()`

## Updated Files

### `worker/lib/services/debate-oracle.ts`

**Changes**:
1. **`signWinnerDistribution()`** - Updated EIP-712 signature:
   - Domain: `'MinimalDebatePool'`
   - Types: `WinnerDistribution` with `debateId`, `winner`, `winnerPrize`
   - Removed `timestamp` from signature

2. **`distributeWinner()`** - New function replacing `declareWinner()`:
   - Takes `debateId`, `winner`, `winnerPrize`, `signature`
   - Calls `MinimalDebatePool.distributeWinner()`

3. **`processBattleCompletion()`** - Updated signature:
   - Now takes `battleId`, `winnerAddress`, `participantCount`
   - Calculates `winnerPrize` (80% of total collected)
   - Calls `distributeWinner()` with calculated prize

4. **Removed Functions**:
   - `getActiveDebates()` - Not in MinimalDebatePool
   - `getDebateDetails()` - Not in MinimalDebatePool

5. **New Functions**:
   - `isDebateCompleted(debateId)` - Check if debate is completed
   - `getPlatformFees(debateId)` - Get platform fees for a debate

### `worker/lib/services/onchain-debate-service.ts`

**Changes**:
1. **Removed `createDebate()`** - No longer needed (debates created in backend)
2. **Removed `getDebate()`** - Not in MinimalDebatePool
3. **Updated Contract ABI** - Only includes MinimalDebatePool functions
4. **New Functions**:
   - `getContractBalance()` - Get contract USDC balance
   - `isDebateCompleted(debateId)` - Check debate completion status

### `worker/lib/services/battle-manager-db.ts`

**Changes**:
1. **Removed `createDebate()` call** in `createNewBattle()`:
   - Debates are now created only in database
   - No on-chain debate creation needed

2. **Updated `processBattleCompletion()` call**:
   - Now passes `battleId`, `winnerAddress`, `participantCount`
   - Gets winner address from database
   - Gets participant count from battle data

## Workflow Changes

### Before (Old Contract):
1. Backend creates debate on-chain → `createDebate()`
2. Users pay and join → `joinDebate()` (removed - now direct USDC transfer)
3. Battle completes → `declareWinner()` with old signature format

### After (MinimalDebatePool):
1. Backend creates debate in database only ✅
2. Users pay by sending USDC directly to contract ✅
3. Backend tracks participants off-chain ✅
4. Battle completes → `distributeWinner()` with:
   - Calculated `winnerPrize` (80% of total collected)
   - New EIP-712 signature format
   - Contract calculates platform fee automatically

## Example Flow

```typescript
// 1. Battle completes in backend
const battle = await db.getBattleById(battleId);
const winner = await db.getUserById(winnerId);
const participantCount = battle.participants.length;

// 2. Calculate winner prize
const totalCollected = participantCount * 1; // 1 USDC per participant
const winnerPrizeUSDC = totalCollected * 0.8; // 80%
const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);

// 3. Distribute on-chain
await oracle.processBattleCompletion(
  battleId,
  winner.address,
  participantCount
);

// Internally calls:
// - oracle.signWinnerDistribution(debateId, winner, winnerPrize)
// - oracle.distributeWinner(debateId, winner, winnerPrize, signature)
```

## Benefits

1. **Gas Savings**: No on-chain debate creation, participant tracking, or points system
2. **Simpler Backend**: Backend handles all logic, contract only stores USDC and distributes
3. **Transparency**: Winner distribution is still on-chain and verifiable via signatures
4. **Flexibility**: Backend can change debate rules without contract upgrades

## Testing Checklist

- [ ] Verify `distributeWinner()` is called with correct parameters
- [ ] Verify EIP-712 signature format matches contract
- [ ] Verify winner prize calculation (80% of total collected)
- [ ] Verify participant count is correctly passed
- [ ] Verify contract balance is sufficient for distribution
- [ ] Verify platform fee is correctly calculated by contract

## Migration Notes

- **No Database Migration Needed**: Existing battle/debate data structure remains the same
- **Environment Variables**: No changes needed
- **Contract Address**: Update `DEBATE_POOL_CONTRACT_ADDRESS` to new MinimalDebatePool address when deployed
- **Oracle Private Key**: Same oracle key can be used (same EIP-712 signing)

## Backward Compatibility

- **Old Contract**: Old `DebatePool.sol` functions are no longer accessible
- **New Contract**: Only works with `MinimalDebatePool.sol`
- **Database**: Fully compatible - no schema changes needed

