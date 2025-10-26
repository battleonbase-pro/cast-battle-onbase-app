# Developer Guide: 1 USDC Payment Flow in Base App Mini App

## Current Implementation Flow

### 1. **Entry Point: UnifiedPaymentButton** (`components/UnifiedPaymentButton.tsx`)
```typescript
// Routes based on environment
switch (environmentInfo.environment) {
  case 'farcaster': // Farcaster Mini App
  case 'base':      // Base App Mini App  
    return <FarcasterPaymentButton />
  case 'external':  // External browser
    return <BasePaymentButton />
}
```

### 2. **For Base App Mini App: FarcasterPaymentButton** (`components/FarcasterPaymentButton.tsx`)
- Uses `@farcaster/miniapp-sdk` SDK
- Direct Ethereum provider calls
- Manual ERC20 transfer encoding: `0xa9059cbb`
- Amount: `parseUnits("1.00", 6)` = 1,000,000

### 3. **For External Browsers: BasePaymentButton** (`components/BasePaymentButton.tsx`)
- Uses `@coinbase/onchainkit/transaction` component
- Automatic transaction lifecycle management
- Amount: `parseUnits("1.00", 6)` = 1,000,000

---

## How BasePaymentButton Works

### Step 1: Setup (Lines 35-69)
```typescript
// Define USDC ABI (only transfer and approve functions)
const usdcAbi = useMemo(() => [
  {
    type: 'function',
    name: 'transfer',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  }
], []);

// Create the transfer call
const calls = useMemo(() => [
  {
    address: USDC_CONTRACT_ADDRESS,  // 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    abi: usdcAbi,
    functionName: 'transfer',
    args: [
      recipientAddress,              // 0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271
      parseUnits("1.00", 6)           // 1,000,000 (6 decimals)
    ]
  }
], [USDC_CONTRACT_ADDRESS, recipientAddress, amount, usdcAbi]);
```

**What this does:**
- Prepares a single function call: `transfer(recipient, 1000000)`
- **Problem**: No approval call included!
- **Why it works**: Base Sepolia testnet USDC contract may allow transfers without approval

### Step 2: Handlers (Lines 71-160)
```typescript
// Callback for transaction status updates
const handleTransactionStatus = useCallback((lifecycleStatus) => {
  if (lifecycleStatus?.statusName !== 'success') {
    console.log('🔍 Transaction status:', lifecycleStatus);
  }
}, []);

// Callback for successful transaction
const handleTransactionSuccess = useCallback((response) => {
  if (hasProcessedSuccessRef.current) return; // Guard against infinite loops
  
  const transactionHash = response.transactionReceipts[0]?.transactionHash;
  hasProcessedSuccessRef.current = true;
  onSuccess?.(transactionHash); // Calls parent's handlePaymentSuccess
}, [onSuccess]);
```

### Step 3: Render Transaction Component (Lines 189-200)
```typescript
<Transaction
  calls={calls}                    // Just the transfer() call
  chainId={84532}                  // Base Sepolia
  onStatus={handleTransactionStatus}
  onSuccess={handleTransactionSuccess}
  onError={handleTransactionError}
  disabled={disabled || loading}
/>
```

---

## How OnchainKit Transaction Component Works

### What it does
1. ✅ Automatically estimates gas
2. ✅ Sponsors fees (if configured)
3. ✅ Shows transaction status updates
4. ✅ Waits for confirmation
5. ✅ Calls onSuccess/onError callbacks

### What it does NOT do
1. ❌ Does NOT check current allowance
2. ❌ Does NOT automatically add approval calls
3. ❌ Does NOT handle ERC20 approval flow

### Why Our Current Implementation Works

**Evidence from web search:**
> "The OnchainKit `<Transaction />` component is designed to manage the entire transaction lifecycle, including gas estimation, fee sponsorship, and status updates. **However, it does not automatically handle ERC-20 token approvals.**"

**Our current implementation:**
```typescript
calls={[
  {
    address: USDC_CONTRACT_ADDRESS,
    functionName: 'transfer',
    args: [recipientAddress, parseUnits("1.00", 6)]
    // ❌ No approval call!
  }
]}
```

**Why it still works:**
1. Base Sepolia testnet USDC may allow direct transfers
2. User might already have approved the pool contract
3. Or the error "insufficient allowance" is being caught and shown to user

---

## Complete Transaction Flow

### User Journey
```
1. User clicks "Pay & Submit"
   ↓
2. UnifiedPaymentButton detects: 'base' environment
   ↓
3. Renders FarcasterPaymentButton (for Mini Apps)
   OR
   Renders BasePaymentButton (for external browsers)
   ↓
4. BasePaymentButton renders <Transaction /> component
   ↓
5. Transaction component:
   - Shows "Confirm Transaction" button
   - User clicks and approves in wallet
   - Sends transfer(address, amount) to USDC contract
   - Waits for mining
   ↓
6. onSuccess callback:
   - Extracts transaction hash
   - Calls handlePaymentSuccess(transactionHash)
   ↓
7. Backend verifies payment:
   - Checks transaction on-chain
   - Verifies amount and recipient
   ↓
8. Auto-submits cast via API
```

---

## Potential Issue: Missing Approval

### The Problem
ERC20 tokens require two steps:
1. **Approve**: Give permission to spender
   ```solidity
   approve(spender, amount)
   ```
2. **Transfer**: Actually send the tokens
   ```solidity
   transfer(recipient, amount)
   ```

### Why Current Code Works
1. **First-time users**: Transaction fails → user gets error → manual approval needed
2. **Returning users**: May already have unlimited approval
3. **Testnet USDC**: Might not enforce approval requirement

### How to Fix It
Add approval call before transfer:

```typescript
const calls = useMemo(() => [
  // Step 1: Approve
  {
    address: USDC_CONTRACT_ADDRESS,
    abi: usdcAbi,
    functionName: 'approve',
    args: [recipientAddress, parseUnits("1000", 6)] // Approve 1000 USDC
  },
  // Step 2: Transfer
  {
    address: USDC_CONTRACT_ADDRESS,
    abi: usdcAbi,
    functionName: 'transfer',
    args: [recipientAddress, parseUnits("1.00", 6)]
  }
], [USDC_CONTRACT_ADDRESS, recipientAddress, amount, usdcAbi]);
```

---

## Summary

**Current implementation:**
- ✅ Uses OnchainKit Transaction component
- ✅ Sends 1 USDC (1,000,000 with 6 decimals)
- ✅ Automatically handles gas, fees, confirmation
- ❌ Does NOT include approval call
- ⚠️ Might work due to testnet quirks or pre-existing approvals

**Recommendation:**
- Add approval call if users see "insufficient allowance" errors
- Current code works for now but isn't production-ready for strict ERC20 enforcement

