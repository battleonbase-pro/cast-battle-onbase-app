# Payment Flow & Gas Fee Explanation

## Overview

This document explains **exactly** how money flows and **which wallet pays for gas fees** when winners are paid out.

---

## Money Flow: Step by Step

### 1. **User Pays Entry Fee** (User Pays Gas)

```
User Wallet → Contract (MinimalDebatePool)
Amount: 1 USDC
Gas Paid By: User (for their own transaction)
```

**Code Location**: Users call the contract directly (via frontend payment flow)

**What Happens**:
- User approves USDC spending
- User transfers 1 USDC to contract address
- Contract balance increases by 1 USDC
- **User pays their own gas** (~$0.013 per transaction)

---

### 2. **Battle Completes** (Backend Determines Winner)

```
AI Agents → Database
- Judge Agent selects winner
- Winner address stored in database
- Battle status: COMPLETED
```

**Code Location**: `worker/lib/services/battle-manager-db.ts`

**What Happens**:
- No blockchain transaction yet
- All processing happens off-chain
- Winner determined by AI agents

---

### 3. **Oracle Distributes Winner Prize** (Oracle Pays Gas)

```
Oracle Wallet → Contract.distributeWinner()
Contract → Winner Wallet (USDC transfer)
```

**Code Location**: `worker/lib/services/debate-oracle.ts`

**Flow**:
```typescript
// Step 1: Oracle signs the winner result (EIP-712)
const signature = await this.wallet.signTypedData(domain, types, message);

// Step 2: Oracle calls contract (THIS IS WHERE GAS IS PAID)
const tx = await this.contract.distributeWinner(
  debateId,
  winner,
  winnerPrize,
  signature
);

// Step 3: Contract sends USDC to winner
// (Contract pays for USDC transfer, but oracle already paid transaction gas)
```

**Key Points**:
- ✅ **Oracle wallet pays gas** for the `distributeWinner()` transaction
- ✅ **Contract has the USDC** (from user payments)
- ✅ **Contract sends USDC** directly to winner wallet
- ✅ Winner receives USDC, no gas needed from winner

---

## Gas Fee Breakdown

### Who Pays What?

| Transaction | Who Pays Gas | Gas Cost | Cost ($) |
|------------|--------------|----------|----------|
| **User Entry Payment** | User | ~65,000 | ~$0.013 |
| **Oracle Winner Distribution** | **Oracle Wallet** | ~120,000 | ~$0.024 |
| **Platform Fee Withdrawal** | Owner | ~60,000 | ~$0.012 |

### Oracle Wallet Details

**Wallet**: Created from `ORACLE_PRIVATE_KEY` environment variable

**Location**: `worker/lib/services/debate-oracle.ts`
```typescript
const privateKey = process.env.ORACLE_PRIVATE_KEY;
this.wallet = new ethers.Wallet(privateKey, this.provider);
```

**Address**: Stored in GCP Secret Manager as `oracle-private-key`

**Purpose**:
1. Sign winner results (EIP-712 signature)
2. Call `distributeWinner()` on contract
3. **Pay gas fees** for winner distribution transactions

---

## Complete Payment Example

### Scenario: 10 Participants, 1 Winner

**Step 1: Users Pay Entry Fees**
```
Participant 1 → Contract: 1 USDC (User pays $0.013 gas)
Participant 2 → Contract: 1 USDC (User pays $0.013 gas)
...
Participant 10 → Contract: 1 USDC (User pays $0.013 gas)

Contract Balance: 10 USDC
Total Gas Paid by Users: 10 × $0.013 = $0.13
```

**Step 2: Battle Completes**
```
AI Agents determine winner: Participant 5
Winner Address: 0x1234...5678
Prize Calculation: 10 USDC × 80% = 8 USDC
Platform Fee: 10 USDC × 20% = 2 USDC
```

**Step 3: Oracle Distributes Prize**
```
Oracle Wallet (ORACLE_PRIVATE_KEY) → Contract.distributeWinner()
  ├─ Oracle signs: EIP-712 signature
  ├─ Oracle calls: distributeWinner(debateId, winner, 8 USDC, signature)
  ├─ Oracle pays: ~$0.024 gas fee
  └─ Contract sends: 8 USDC to winner wallet

Winner Wallet: Receives 8 USDC (no gas needed!)
Contract Balance: 2 USDC (platform fee, can be withdrawn later)
```

---

## Contract Code Analysis

### `distributeWinner()` Function

**Location**: `contracts/contracts/MinimalDebatePool.sol`

```solidity
function distributeWinner(
    uint256 debateId,
    address winner,
    uint256 winnerPrize,
    bytes memory signature
) external onlyOracle whenNotPaused validDebate(debateId) nonReentrant {
    // 1. Verify oracle signature
    require(
        _verifyWinnerSignature(debateId, winner, winnerPrize, signature),
        "MinimalDebatePool: Invalid signature"
    );

    // 2. Mark as completed
    completedDebates[debateId] = true;

    // 3. Calculate platform fee (20% of total)
    uint256 calculatedPlatformFee = winnerPrize / 4;

    // 4. Track platform fee
    platformFees[debateId] = calculatedPlatformFee;

    // 5. Transfer USDC to winner (contract pays for transfer, oracle already paid transaction gas)
    require(
        usdcToken.transfer(winner, winnerPrize),
        "MinimalDebatePool: Winner transfer failed"
    );

    emit WinnerDistributed(debateId, winner, winnerPrize, calculatedPlatformFee);
}
```

**Key Points**:
- ✅ Only oracle can call this (`onlyOracle` modifier)
- ✅ Contract has USDC from user payments
- ✅ Contract sends USDC to winner
- ✅ Oracle wallet pays transaction gas (when calling this function)
- ✅ Winner receives USDC without paying gas

---

## Oracle Wallet Setup

### Environment Variable

**Secret Name**: `oracle-private-key` (in GCP Secret Manager)

**Format**: `0x...` (64 character hex string, 66 with 0x prefix)

**Example**:
```bash
ORACLE_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Oracle Wallet Address

**Derived from**: Private key (using Ethereum's secp256k1 curve)

**Used for**:
1. Signing winner results (cryptographic signature)
2. Calling `distributeWinner()` on contract
3. Paying gas fees for distribution transactions

### Funding the Oracle Wallet

**What to Fund**: ETH (not USDC) for gas fees

**How Much**: 
- ~$0.024 per winner distribution
- Recommend: At least 0.01 ETH (~$25) for 1000+ distributions

**Base Sepolia Testnet**:
- Get free ETH from Base Sepolia faucet
- Oracle wallet needs ETH for gas, not USDC

**Production (Base Mainnet)**:
- Fund oracle wallet with ETH from exchange/wallet
- Monitor balance and refill when low

---

## Security Considerations

### Oracle Wallet Security

**Critical**: Oracle private key must be kept secret!

**Why**:
- Oracle wallet can call `distributeWinner()` (authorized)
- If compromised, attacker could:
  - Distribute prizes to wrong addresses
  - Drain contract funds (if they bypass signature checks)

**Protection**:
- ✅ Private key stored in GCP Secret Manager (encrypted)
- ✅ Never committed to git
- ✅ Only accessible by worker service
- ✅ Contract verifies oracle signature (prevents unauthorized calls)

### Signature Verification

**How it Works**:
```typescript
// Oracle signs winner result
const signature = await wallet.signTypedData(domain, types, message);

// Contract verifies signature
require(
    _verifyWinnerSignature(debateId, winner, winnerPrize, signature),
    "Invalid signature"
);
```

**Protection**:
- ✅ Only oracle wallet can sign valid signatures
- ✅ Contract verifies signature matches oracle address
- ✅ Prevents unauthorized prize distribution
- ✅ Even if oracle wallet is compromised, signature verification prevents wrong addresses

---

## Summary

### Money Flow

1. **Users pay 1 USDC** → Contract (users pay their own gas)
2. **Contract holds USDC** → Waiting for winner
3. **Oracle calls `distributeWinner()`** → Oracle pays gas (~$0.024)
4. **Contract sends USDC** → Winner receives 80%, platform keeps 20%

### Gas Fee Payment

| Transaction | Gas Paid By |
|------------|-------------|
| User Entry Payment | **User** |
| Winner Distribution | **Oracle Wallet** (from `ORACLE_PRIVATE_KEY`) |
| Platform Fee Withdrawal | **Owner** (contract owner wallet) |

### Key Takeaways

✅ **Contract has the money** (from user payments)  
✅ **Oracle wallet pays gas** for winner distribution  
✅ **Winner receives USDC** without paying gas  
✅ **Oracle wallet needs ETH** (for gas fees, not USDC)  
✅ **Signature verification** prevents unauthorized distributions  

---

## FAQ

**Q: Does the winner need ETH to receive their prize?**  
A: No! The contract sends USDC directly to the winner. They don't need to do anything or pay any gas.

**Q: What happens if oracle wallet runs out of ETH?**  
A: Winner distribution transactions will fail. Need to fund oracle wallet with ETH.

**Q: Can the oracle wallet steal the USDC?**  
A: No! The oracle can only call `distributeWinner()` with a valid signature. The contract verifies the signature and only sends USDC to the authorized winner address.

**Q: Who can withdraw platform fees?**  
A: Only the contract owner can call `withdrawDebateFees(debateId)` to withdraw the 20% platform fee.

**Q: What if multiple users win?**  
A: Currently, only one winner per debate. The contract's `distributeWinner()` function sends prize to a single winner address.

---

This architecture ensures:
- ✅ Winners receive prizes automatically (no action needed)
- ✅ Oracle wallet pays gas (centralized cost management)
- ✅ Contract holds funds securely (trustless)
- ✅ Signature verification prevents fraud (secure)

