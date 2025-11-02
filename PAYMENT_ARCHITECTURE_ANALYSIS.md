# Payment Architecture Analysis

## Overview
The application implements a **multi-environment payment system** that routes to different payment methods based on the detected environment (Base Mini App, Farcaster Mini App, or External Browser).

## Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UnifiedPaymentButton                      │
│              (Environment-Aware Router)                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├─ Environment Detection
                          │  (useEnvironmentDetection)
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────────┐
│  Farcaster Mini  │              │  Base Mini App       │
│       App        │              │  + External Browser  │
└──────────────────┘              └──────────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────────┐
│FarcasterPayment  │              │ BasePaymentButton     │
│    Button        │              │  (OnchainKit)         │
└──────────────────┘              └──────────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────────┐
│ Farcaster SDK    │              │ OnchainKit Transaction│
│ Ethereum Provider│              │  Component            │
└──────────────────┘              └──────────────────────┘
```

---

## 1. Environment Detection

### Location: `hooks/useEnvironmentDetection.ts`

**How it works:**
1. Uses `useMiniKit()` hook to get MiniKit context
2. Checks `context.client.clientFid`:
   - `9152` = Farcaster Mini App
   - `309857` = Base App Mini App
   - No context/fallback = External Browser
3. 2-second timeout fallback if context unavailable

**Detection Result:**
```typescript
{
  environment: 'farcaster' | 'base' | 'external',
  isMiniApp: boolean,
  isFarcaster: boolean,
  isBaseApp: boolean,
  isLoading: boolean
}
```

---

## 2. Payment Routing

### Location: `components/UnifiedPaymentButton.tsx`

**Routing Logic:**
```typescript
switch (environmentInfo.environment) {
  case 'farcaster':
    return <FarcasterPaymentButton />;
  case 'base':
    return <BasePaymentButton />;  // OnchainKit
  case 'external':
  default:
    return <BasePaymentButton />;  // OnchainKit
}
```

**Key Points:**
- Both Base Mini App and External Browser use `BasePaymentButton`
- Only Farcaster uses custom `FarcasterPaymentButton`
- Unified interface: same props (`onSuccess`, `amount`, `recipientAddress`)

---

## 3. Payment Implementations by Environment

### 3.1 Farcaster Mini App Payment

**Component:** `components/FarcasterPaymentButton.tsx`

**How it works:**
1. **Uses OnchainKit Transaction Component** (same as Base Mini App)
   ```tsx
   <Transaction
     calls={calls}
     chainId={84532}  // Base Sepolia
     onStatus={handleTransactionStatus}
     onSuccess={handleTransactionSuccess}
     onError={handleTransactionError}
   />
   ```

2. **Uses Wagmi Hooks:**
   - `useAccount()` - Get connected address
   - `useConnect()` - Connect to Farcaster Mini App connector
   - `useBalance()` - Check gas balance

3. **Auto-Connection:**
   - Automatically connects to `farcasterMiniApp` connector on mount
   - Uses `miniAppConnector()` from wagmi-config
   - If not connected, shows "Connect Farcaster Wallet to Pay" button

4. **Transaction Configuration:**
   ```typescript
   const calls = [{
     address: USDC_CONTRACT_ADDRESS,
     abi: usdcAbi,
     functionName: 'transfer',
     args: [recipientAddress, parseUnits(amount, 6)]
   }];
   ```

5. **Lifecycle Handling:**
   - `onStatus`: Tracks transaction lifecycle (init, building, pending, error)
   - `onSuccess`: Receives `TransactionResponseType` with receipts
   - `onError`: Handles transaction failures

**Pros:**
- Automatic gas estimation (no hardcoded limits)
- Built-in error handling
- Lifecycle status tracking
- Event-driven callbacks (no polling)
- Consistent API with Base Mini App and External Browser
- Works with Farcaster Mini App connector

**Cons:**
- Depends on OnchainKit (larger bundle)
- Requires wagmi setup

---

### 3.2 Base Mini App Payment

**Component:** `components/BasePaymentButton.tsx`

**How it works:**
1. **Uses OnchainKit Transaction Component:**
   ```tsx
   <Transaction
     calls={calls}
     chainId={84532}  // Base Sepolia
     onStatus={handleTransactionStatus}
     onSuccess={handleTransactionSuccess}
     onError={handleTransactionError}
   />
   ```

2. **Uses Wagmi Hooks:**
   - `useAccount()` - Get connected address
   - `useConnect()` - Connect wallet if needed
   - `useBalance()` - Check gas balance

3. **Transaction Configuration:**
   ```typescript
   const calls = [{
     address: USDC_CONTRACT_ADDRESS,
     abi: usdcAbi,
     functionName: 'transfer',
     args: [recipientAddress, parseUnits(amount, 6)]
   }];
   ```

4. **Auto-Connection:**
   - If wallet not connected, shows "Connect Wallet" button
   - Uses `baseAccount` connector (from wagmi-config)
   - Auto-connects in Base Mini App (users already connected)

5. **Lifecycle Handling:**
   - `onStatus`: Tracks transaction lifecycle (init, building, pending, error)
   - `onSuccess`: Receives `TransactionResponseType` with receipts
   - `onError`: Handles transaction failures

**Pros:**
- Automatic gas estimation
- Built-in error handling
- Lifecycle status tracking
- Works with Base Account SDK
- No manual encoding needed

**Cons:**
- Depends on OnchainKit (larger bundle)
- Requires wagmi setup

---

### 3.3 External Browser Payment

**Component:** `components/BasePaymentButton.tsx` (Same as Base Mini App)

**How it works:**
1. **Same OnchainKit Transaction Component** as Base Mini App
2. **Different Wallet Connection:**
   - Shows "Connect Wallet to Pay" if not connected
   - Uses `coinbaseWallet` or `injected` connectors
   - Lets OnchainKit's `ConnectWallet` handle discovery (EIP-6963)

3. **Wagmi Configuration:**
   - External browsers: OnchainKit handles wallet discovery
   - No manual `injected()` or `metaMask()` connectors
   - Prevents `eip6963RequestProvider` errors

**Key Differences from Base Mini App:**
- User must manually connect wallet (not auto-connected)
- Supports multiple wallet types (Coinbase Wallet, MetaMask, injected)
- Uses OnchainKit's built-in wallet discovery

---

## 4. Wagmi Configuration

### Location: `lib/wagmi-config.ts`

**Connectors Setup:**
```typescript
const connectors = [
  baseAccount({ appName: 'NewsCast Debate' }),  // For Base Mini App
  miniAppConnector(),  // For Farcaster Mini App
  // External wallets handled by OnchainKit (no manual connectors)
];
```

**Strategy:**
- **Mini Apps:** Use `baseAccount` + `miniAppConnector` only
- **External Browsers:** Let OnchainKit's `ConnectWallet` handle discovery via EIP-6963
- **No manual `injected()` or `metaMask()` connectors** to prevent EIP-6963 errors

---

## 5. Transaction Flow Comparison

### Farcaster Mini App:
```
User clicks "Pay & Submit"
  ↓
OnchainKit Transaction component
  ↓
Auto-connect to Farcaster Mini App connector (if not connected)
  ↓
Build transaction via wagmi (automatic)
  ↓
Estimate gas (automatic)
  ↓
Send transaction (wagmi handles)
  ↓
Track lifecycle status
  ↓
onSuccess(TransactionResponseType) called
  ↓
Auto-submit cast
```

### Base Mini App + External Browser:
```
User clicks "Pay & Submit"
  ↓
OnchainKit Transaction component
  ↓
Check wallet connection (auto in Base, manual in external)
  ↓
Build transaction via wagmi (automatic)
  ↓
Estimate gas (automatic)
  ↓
Send transaction (wagmi handles)
  ↓
Track lifecycle status
  ↓
onSuccess(TransactionResponseType) called
  ↓
Auto-submit cast
```

---

## 6. Payment Verification

**Location:** `app/api/battle/submit-cast/route.ts`

**How it works:**
1. Backend receives cast submission with `transactionId`
2. Verifies transaction on-chain:
   - Checks transaction receipt
   - Verifies USDC transfer to contract address
   - Validates amount (1 USDC)
3. If valid, creates cast and awards points

**Transaction Verification Logic:**
```typescript
// Verifies:
// 1. Transaction exists on-chain
// 2. Transaction is to USDC contract
// 3. Transfer is to debate pool address
// 4. Amount matches (1 USDC = 1,000,000 units with 6 decimals)
```

---

## 7. Common Payment Parameters

**All Environments:**
- **Amount:** `"1.00"` USDC
- **Recipient:** `process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS`
- **Token:** USDC on Base Sepolia (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)
- **Chain:** Base Sepolia (Chain ID: 84532)
- **Decimals:** 6 (USDC standard)

---

## 8. Error Handling

### All Payment Types (OnchainKit):
- `onError` callback for transaction errors
- `onStatus` tracks error lifecycle state
- Detailed error logging with stack traces
- Automatic error recovery handling

---

## 9. State Management

**Payment Success Flow:**
1. Payment button calls `onSuccess(transactionHash)`
2. `handlePaymentSuccess()` in `page.tsx`:
   - Sets `hasProcessedPayment = true`
   - Calls `submitCastAfterPayment(transactionHash)`
3. Backend verifies transaction and creates cast
4. UI shows success message

**Form State (Context):**
- `castContent` and `selectedSide` stored in `AuthContext`
- Prevents loss during Fast Refresh/payment flow
- Persists across component remounts

---

## 10. Advantages & Considerations

### Advantages:
✅ **Unified API:** Same interface (`onSuccess`, `amount`, `recipientAddress`)  
✅ **Unified Implementation:** All environments use OnchainKit Transaction component  
✅ **Environment-aware:** Automatically routes to correct connector  
✅ **Error handling:** Comprehensive error handling in all environments  
✅ **Gas management:** Automatic gas estimation across all environments  
✅ **Auto-connection:** Base and Farcaster Mini Apps auto-connect wallets  
✅ **Transaction verification:** Backend verifies all payments on-chain  

### Considerations:
⚠️ **All:** Depends on OnchainKit (larger bundle size)  
⚠️ **All:** Requires wagmi setup  
⚠️ **External:** Requires manual wallet connection  
⚠️ **All:** Requires wallet connection before payment  

---

## 11. Code Locations Summary

| Component | File | Purpose |
|-----------|------|---------|
| Payment Router | `components/UnifiedPaymentButton.tsx` | Routes to correct payment component |
| Base/External Payment | `components/BasePaymentButton.tsx` | OnchainKit-based payment for Base/External |
| Farcaster Payment | `components/FarcasterPaymentButton.tsx` | OnchainKit-based payment for Farcaster |
| Environment Detection | `hooks/useEnvironmentDetection.ts` | Detects current environment |
| Wagmi Config | `lib/wagmi-config.ts` | Wallet connectors configuration |
| Transaction Verification | `app/api/battle/submit-cast/route.ts` | Backend payment verification |

---

## 12. Testing Checklist

### Farcaster Mini App:
- [ ] Payment button visible
- [ ] Transaction sends successfully
- [ ] Transaction hash returned
- [ ] Cast submitted after payment
- [ ] Error handling works

### Base Mini App:
- [ ] Auto-connected wallet
- [ ] Transaction component renders
- [ ] Transaction sends successfully
- [ ] Lifecycle status tracked
- [ ] Cast submitted after payment

### External Browser:
- [ ] Connect wallet flow works
- [ ] Transaction component renders
- [ ] Multiple wallet types supported
- [ ] Transaction sends successfully
- [ ] Cast submitted after payment

---

## Conclusion

The payment system uses **environment-aware routing** with a **unified OnchainKit implementation**:
- **Farcaster Mini App:** OnchainKit Transaction with Farcaster Mini App connector (auto-connect)
- **Base Mini App:** OnchainKit Transaction with Base Account connector (auto-connect)
- **External Browser:** OnchainKit Transaction with multi-wallet support (manual connect)

All environments:
- Use the same OnchainKit `Transaction` component
- Have automatic gas estimation and error handling
- Support lifecycle status tracking
- Converge on the same backend verification and cast submission flow
- Provide consistent user experience across platforms

