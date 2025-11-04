# MinimalDebatePool Contract - Function-by-Function Explanation

## Overview

This contract is a **minimal on-chain contract** that handles only essential trustless operations:
- **USDC storage** (holds participant payments)
- **Winner distribution** (trustless, verifiable via signatures)
- **Platform fee tracking** (transparent and auditable)
- **Emergency controls** (pause/unpause)
- **Refund mechanisms** (safety features)

Everything else (debate creation, participant tracking, points, etc.) is handled off-chain by the backend.

---

## 📋 Constructor

### `constructor(address _usdcToken, address _oracle)`

**Purpose**: Initialize the contract when it's deployed.

**Parameters**:
- `_usdcToken`: Address of the USDC token contract (e.g., on Base Sepolia)
- `_oracle`: Address of the backend/oracle that will sign winner distributions

**What it does**:
1. Validates that USDC token address is not zero
2. Validates that oracle address is not zero
3. Sets the contract deployer as the owner
4. Initializes EIP-712 for signature verification
5. Stores USDC token and oracle addresses (immutable - cannot be changed)

**Example**:
```solidity
// Deploy contract
MinimalDebatePool pool = new MinimalDebatePool(
    0x036CbD53842c5426634e7929541eC2318f3dCF7e, // USDC on Base Sepolia
    0x1234...5678 // Backend oracle address
);
```

**Why immutable**: Security - prevents changing the token or oracle after deployment.

---

## 🏆 Winner Distribution

### `distributeWinner(uint256 debateId, address winner, uint256 winnerPrize, bytes memory signature)`

**Purpose**: Distribute the winner prize when a debate ends. This is the **core function** of the contract.

**Who can call**: Only the oracle (backend)

**Parameters**:
- `debateId`: Unique ID for the debate (prevents double distribution)
- `winner`: Address of the debate winner
- `winnerPrize`: Amount in USDC to send to winner (80% of total collected)
- `signature`: Oracle's cryptographic signature (proves backend authorized this)

**What it does**:
1. **Checks**:
   - Contract is not paused
   - Debate is not paused
   - Debate hasn't been completed already
   - Winner address is valid (not zero)
   - Winner prize is greater than 0
   - Winner prize doesn't exceed contract balance (prevents draining)

2. **Verifies signature**: Uses EIP-712 to verify the oracle signed this specific distribution

3. **Marks debate as completed**: Prevents double distribution

4. **Calculates platform fee**: `platformFee = winnerPrize / 4` (20% of total)

5. **Tracks platform fee**: Stores it in `platformFees[debateId]` for later withdrawal

6. **Transfers winner prize**: Sends USDC to winner's address

7. **Emits event**: `WinnerDistributed` (for blockchain monitoring)

**Flow Example**:
```
Debate #123 ends:
- Total collected: 10 USDC
- Backend calculates: winner gets 8 USDC (80%)
- Backend signs: debateId=123, winner=0xABC..., prize=8 USDC
- Oracle calls: distributeWinner(123, 0xABC..., 8e6, signature)
- Contract:
  ✅ Verifies signature
  ✅ Calculates platform fee: 8 / 4 = 2 USDC
  ✅ Sends 8 USDC to winner
  ✅ Tracks 2 USDC as platform fee
  ✅ Marks debate #123 as completed
```

**Security**:
- ✅ Signature verification prevents unauthorized distributions
- ✅ `completedDebates` prevents double distribution
- ✅ Balance check prevents draining
- ✅ `nonReentrant` prevents reentrancy attacks

---

## 💰 Platform Fee Withdrawal

### `withdrawDebateFees(uint256 debateId)`

**Purpose**: Allow owner to withdraw platform fees collected from a specific debate.

**Who can call**: Only the contract owner

**Parameters**:
- `debateId`: Debate ID to withdraw fees from

**What it does**:
1. **Checks**:
   - Debate is completed
   - Platform fees exist for this debate (fees > 0)

2. **Clears fee tracking**: Sets `platformFees[debateId] = 0` (prevents double withdrawal)

3. **Transfers fees**: Sends USDC to owner's address

4. **Emits event**: `FeesWithdrawn`

**Example**:
```solidity
// After debate #123 completes with 2 USDC platform fee:
owner.withdrawDebateFees(123);
// Owner receives 2 USDC
```

**Why per-debate**: 
- Prevents accidentally withdrawing all fees at once
- Allows precise tracking per debate
- Reduces gas costs (no loops)

---

### `withdrawAllFees()`

**Purpose**: **DEPRECATED** - This function is disabled for safety.

**What it does**: Always reverts with error message.

**Why disabled**:
- Could cause gas issues if many debates
- Less precise than per-debate withdrawal
- Safety mechanism to prevent accidental large withdrawals

**Alternative**: Use `withdrawDebateFees(debateId)` for each debate individually.

---

## 🛑 Emergency Controls

### `togglePause()`

**Purpose**: Pause or unpause the entire contract in emergency situations.

**Who can call**: Only the contract owner

**What it does**:
- If paused: Unpauses the contract
- If unpaused: Pauses the contract

**When to use**:
- Security incident detected
- Critical bug found
- Need to stop all operations temporarily

**Effect**: When paused, `distributeWinner()` and `processRefund()` cannot be called.

**Example**:
```solidity
// Emergency: Pause contract
owner.togglePause(); // Sets paused = true

// Fix issue...

// Resume: Unpause contract
owner.togglePause(); // Sets paused = false
```

---

### `pauseDebate(uint256 debateId)`

**Purpose**: Pause a specific debate (not the entire contract).

**Who can call**: Only the contract owner

**Parameters**:
- `debateId`: Debate ID to pause

**What it does**: Sets `pausedDebates[debateId] = true`

**Effect**: Prevents `distributeWinner()` and `processRefund()` for this specific debate.

**Use case**: One debate has an issue, but others should continue.

**Example**:
```solidity
// Pause debate #123 due to dispute
owner.pauseDebate(123);

// Debate #123 is now paused, but debate #124 can still operate normally
```

---

### `unpauseDebate(uint256 debateId)`

**Purpose**: Unpause a specific debate that was paused.

**Who can call**: Only the contract owner

**Parameters**:
- `debateId`: Debate ID to unpause

**What it does**: Sets `pausedDebates[debateId] = false`

**Example**:
```solidity
// Resolve dispute and unpause debate #123
owner.unpauseDebate(123);

// Debate #123 can now operate normally again
```

---

## 💸 Refund Functions (Safety Mechanisms)

### `processRefund(uint256 debateId, address[] calldata recipients, uint256 refundAmount, bytes memory signature)`

**Purpose**: Process refunds for participants when a debate needs to be cancelled or refunded.

**Who can call**: Only the oracle (backend)

**Parameters**:
- `debateId`: Debate ID
- `recipients`: Array of addresses to refund
- `refundAmount`: Amount to refund per recipient (same for all)
- `signature`: Oracle signature authorizing this refund

**What it does**:
1. **Checks**:
   - Contract is not paused
   - Debate is not paused
   - Debate is not completed
   - Recipients array is not empty
   - Recipients count ≤ 100 (prevents gas exhaustion)
   - Refund amount > 0
   - Refund amount is reasonable (≤ contract balance / recipients)

2. **Verifies signature**: Oracle must sign the refund authorization

3. **Loops through recipients**: Sends `refundAmount` USDC to each recipient

4. **Emits events**: `RefundProcessed` for each recipient

**Example**:
```solidity
// Debate #123 cancelled, need to refund 3 participants
address[] memory recipients = [
    0x1111..., // Participant 1
    0x2222..., // Participant 2
    0x3333...  // Participant 3
];
uint256 refundAmount = 1e6; // 1 USDC per person

// Backend signs this refund
oracle.processRefund(123, recipients, refundAmount, signature);

// Each participant receives 1 USDC
```

**Security**:
- ✅ Signature required (prevents unauthorized refunds)
- ✅ Max 100 recipients (prevents gas exhaustion)
- ✅ Amount validation (prevents excessive refunds)
- ✅ Can't refund after debate completed

---

### `emergencyRefund(uint256 debateId, address[] calldata recipients, uint256 refundAmount)`

**Purpose**: Emergency refund by owner (no signature required). Use when oracle is compromised or unavailable.

**Who can call**: Only the contract owner

**Parameters**:
- `debateId`: Debate ID
- `recipients`: Array of addresses to refund
- `refundAmount`: Amount to refund per recipient

**What it does**: Same as `processRefund()`, but:
- **No signature required** (owner can call directly)
- **No pause check** (works even if contract is paused)

**When to use**:
- Oracle private key is compromised
- Oracle backend is down
- Need immediate refund without waiting for signature

**Example**:
```solidity
// Emergency: Oracle compromised, need to refund immediately
owner.emergencyRefund(123, recipients, 1e6);

// Participants receive refunds without waiting for oracle signature
```

**Security Note**: Owner has full control, so this should only be used in true emergencies.

---

## 👀 View Functions (Read-Only)

### `getContractBalance()`

**Purpose**: Get the total USDC balance held by the contract.

**Who can call**: Anyone (public view function)

**Returns**: `uint256` - Total USDC balance in the contract

**Example**:
```solidity
uint256 balance = pool.getContractBalance();
// Returns: 5000000 (5 USDC, with 6 decimals)
```

**Use case**: Check how much USDC is locked in the contract.

---

### `isDebateCompleted(uint256 debateId)`

**Purpose**: Check if a debate has been completed (winner distributed).

**Who can call**: Anyone (public view function)

**Parameters**:
- `debateId`: Debate ID to check

**Returns**: `bool` - `true` if completed, `false` otherwise

**Example**:
```solidity
bool completed = pool.isDebateCompleted(123);
// Returns: true (if winner was distributed)
// Returns: false (if debate is still active)
```

**Use case**: Frontend can check debate status before showing UI.

---

### `getPlatformFees(uint256 debateId)`

**Purpose**: Get the platform fees collected from a specific debate.

**Who can call**: Anyone (public view function)

**Parameters**:
- `debateId`: Debate ID

**Returns**: `uint256` - Platform fees in USDC (0 if not completed or already withdrawn)

**Example**:
```solidity
uint256 fees = pool.getPlatformFees(123);
// Returns: 2000000 (2 USDC, with 6 decimals)
```

**Use case**: Track how much platform fees are available for withdrawal.

---

## 🔒 Internal Functions (Signature Verification)

### `_verifyWinnerSignature(uint256 debateId, address winner, uint256 winnerPrize, bytes memory signature)`

**Purpose**: Internal function to verify the oracle's signature for winner distribution.

**What it does**:
1. Creates a hash of the winner distribution data (debateId, winner, winnerPrize)
2. Wraps it with EIP-712 domain separator
3. Recovers the signer from the signature
4. Checks if signer matches the oracle address

**Returns**: `true` if signature is valid, `false` otherwise

**Security**: Uses EIP-712 standard for secure signature verification.

---

### `_verifyRefundSignature(bytes32 messageHash, bytes memory signature)`

**Purpose**: Internal function to verify the oracle's signature for refunds.

**What it does**:
1. Takes the message hash (already calculated in `processRefund`)
2. Wraps it with EIP-712 domain separator
3. Recovers the signer from the signature
4. Checks if signer matches the oracle address

**Returns**: `true` if signature is valid, `false` otherwise

**Security**: Uses EIP-712 standard for secure signature verification.

---

## 🔐 Modifiers (Access Control)

### `onlyOracle`

**Purpose**: Restrict function to oracle address only.

**Used in**: `distributeWinner()`, `processRefund()`

**What it does**: Reverts if `msg.sender != oracle`

---

### `whenNotPaused`

**Purpose**: Prevent function execution when contract is paused.

**Used in**: `distributeWinner()`, `processRefund()`

**What it does**: Reverts if `paused == true`

---

### `validDebate(uint256 debateId)`

**Purpose**: Prevent function execution when a specific debate is paused.

**Used in**: `distributeWinner()`, `processRefund()`, `emergencyRefund()`

**What it does**: Reverts if `pausedDebates[debateId] == true`

---

### `nonReentrant`

**Purpose**: Prevent reentrancy attacks (calling function multiple times before first call completes).

**Used in**: `distributeWinner()`, `withdrawDebateFees()`, `processRefund()`, `emergencyRefund()`

**What it does**: Locks the function during execution, prevents recursive calls.

---

## 📊 State Variables

### Constants
- `PLATFORM_FEE_PERCENTAGE = 20`: 20% platform fee (not used in calculation, informational)
- `BASIS_POINTS = 10000`: Standard for percentage calculations (not used currently)
- `MAX_REFUND_RECIPIENTS = 100`: Maximum recipients per refund call

### Immutable (Set Once, Never Change)
- `usdcToken`: USDC token contract address
- `oracle`: Oracle address (backend that signs distributions)

### Mutable State
- `paused`: Global pause flag (true = contract paused)
- `completedDebates[debateId]`: Maps debate ID to completion status
- `pausedDebates[debateId]`: Maps debate ID to pause status
- `platformFees[debateId]`: Maps debate ID to platform fee amount

---

## 🎯 Function Summary Table

| Function | Who Can Call | Purpose | Key Security |
|----------|--------------|---------|--------------|
| `distributeWinner()` | Oracle | Distribute winner prize | Signature verification |
| `withdrawDebateFees()` | Owner | Withdraw platform fees | Per-debate, prevents double withdrawal |
| `withdrawAllFees()` | Owner | **DISABLED** | Always reverts |
| `togglePause()` | Owner | Pause/unpause contract | Emergency control |
| `pauseDebate()` | Owner | Pause specific debate | Emergency control |
| `unpauseDebate()` | Owner | Unpause specific debate | Emergency control |
| `processRefund()` | Oracle | Refund participants | Signature verification |
| `emergencyRefund()` | Owner | Emergency refund | No signature needed |
| `getContractBalance()` | Anyone | View contract balance | Read-only |
| `isDebateCompleted()` | Anyone | Check debate status | Read-only |
| `getPlatformFees()` | Anyone | View platform fees | Read-only |

---

## 🔄 Typical Workflow

### Normal Flow:
1. **Participants pay**: Users send USDC to contract (via direct transfer)
2. **Backend tracks**: Backend tracks participants off-chain
3. **Debate ends**: Backend determines winner
4. **Oracle signs**: Backend signs winner distribution
5. **Distribute**: `distributeWinner()` sends prize to winner
6. **Withdraw fees**: Owner calls `withdrawDebateFees()` to get platform fee

### Refund Flow:
1. **Issue detected**: Debate needs to be cancelled
2. **Backend signs**: Backend signs refund authorization
3. **Process refund**: `processRefund()` sends USDC back to participants

### Emergency Flow:
1. **Emergency detected**: Security issue or oracle compromised
2. **Owner pauses**: `togglePause()` or `pauseDebate()`
3. **Fix issue**: Resolve the problem
4. **Resume**: `togglePause()` or `unpauseDebate()`
5. **If needed**: `emergencyRefund()` if oracle unavailable

---

## ✅ Security Features

1. **Signature Verification**: All critical operations require oracle signature
2. **Reentrancy Protection**: `nonReentrant` modifier prevents attacks
3. **Access Control**: Only oracle/owner can call sensitive functions
4. **Balance Checks**: Prevents draining contract
5. **Pause Mechanism**: Emergency stop capability
6. **Double Distribution Prevention**: `completedDebates` mapping
7. **Gas Limits**: Max 100 recipients per refund
8. **Amount Validation**: Prevents excessive refunds

---

This contract is designed to be **minimal, secure, and gas-efficient** while maintaining trustless operation for critical functions.

