# Payment Flow Analysis for 1 USDC Transaction

## Current Implementation

### Transaction Details
- **Amount**: 1.00 USDC
- **Amount in wei**: 1,000,000 (6 decimals)
- **Chain**: Base Sepolia (Chain ID: 84532)
- **USDC Contract**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Recipient**: `0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271` (DebatePool)

### Current Flow (Line 128-130 in BasePaymentButton.tsx)
```typescript
const calls = useMemo(() => [
  {
    address: USDC_CONTRACT_ADDRESS,
    abi: [/* full USDC ABI */],
    functionName: 'transfer',
    args: [recipientAddress, parseUnits("1.00", 6)]  // 1,000,000
  }
], [USDC_CONTRACT_ADDRESS, recipientAddress, amount]);
```

## The Problem

### ERC20 Token Transfer Requirements
1. **First-time users**: Must approve USDC for the spender contract
2. **Subsequent users**: May already have approval (max allowance = unlimited)
3. **OnchainKit Transaction component**: Does NOT automatically handle approvals

### What's Happening
When the user clicks "Pay & Submit":
1. ✅ Transaction is created: `transfer(0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271, 1000000)`
2. ❌ **Fails** if no approval exists
3. ❌ Error: "insufficient allowance" or "ERC20: transfer amount exceeds allowance"

### Expected vs Actual Behavior
- **Expected**: User approves first (if needed), then transfers
- **Actual**: Only transfer is attempted, fails without approval

## Solutions

### Option 1: Add Approval + Transfer Batched Calls ✅ (Recommended)
```typescript
const calls = useMemo(() => [
  // Step 1: Approve unlimited USDC for the recipient
  {
    address: USDC_CONTRACT_ADDRESS,
    abi: [/* approve function */],
    functionName: 'approve',
    args: [recipientAddress, parseUnits("1000", 6)]  // Approve large amount
  },
  // Step 2: Transfer 1 USDC
  {
    address: USDC_CONTRACT_ADDRESS,
    abi: [/* transfer function */],
    functionName: 'transfer',
    args: [recipientAddress, parseUnits("1.00", 6)]
  }
], [USDC_CONTRACT_ADDRESS, recipientAddress, amount]);
```

**Pros**: 
- Works for first-time and returning users
- All in one transaction (atomic)

**Cons**: 
- Returns approval on subsequent uses (wasteful)
- User needs to approve twice if they only want to spend 1 USDC

### Option 2: Use OnchainKit Auto Approval ✅✅ (Best)
OnchainKit should handle approvals automatically when needed. Let me check if there's a `token` or `approve` prop.

### Option 3: Check Allowance First (Current Workaround)
```typescript
// Check if user has sufficient allowance
// If not, show approval + transfer
// If yes, just transfer
```

## Recommendation
Check OnchainKit Transaction component documentation for:
- `requiresApproval` prop
- Auto-approval functionality
- Multi-call support for approve + transfer

If auto-approval is not available, use **Option 1** with unlimited approval.

