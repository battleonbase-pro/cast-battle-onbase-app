# Technical Payment Flow - Components & Libraries

## 🏗️ Architecture Overview

```
DebateForm.tsx
    ↓
UnifiedPaymentButton.tsx (Router)
    ↓ (Environment Detection)
    ├─→ FarcasterPaymentButton.tsx (Farcaster/Base Mini Apps)
    └─→ BasePaymentButton.tsx (External Browsers)
```

---

## 📦 Libraries Used

### 1. **@coinbase/onchainkit**
**Purpose**: Coinbase's Ethereum development toolkit
**Used in**: 
- `BasePaymentButton.tsx` - Transaction component
- `OnchainKitAuth.tsx` - Authentication
- `rootProvider.tsx` - Provider setup

**Components**:
```typescript
import { Transaction } from '@coinbase/onchainkit/transaction';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
```

### 2. **@farcaster/miniapp-sdk**
**Purpose**: Farcaster Mini App SDK
**Used in**: 
- `FarcasterPaymentButton.tsx` - Direct ETH provider calls
- `FarcasterAuth.tsx` - Farcaster authentication

**Key Method**:
```typescript
import { sdk } from '@farcaster/miniapp-sdk';
const ethProvider = await sdk.wallet.getEthereumProvider();
```

### 3. **wagmi** (Ethereum Hooks)
**Purpose**: React hooks for Ethereum
**Used in**:
- `BasePaymentButton.tsx` - Account, connection, balance
- `OnchainKitAuth.tsx` - Wallet connection status

**Hooks**:
```typescript
import { useAccount, useConnect, useBalance } from 'wagmi';
const { address, isConnected } = useAccount();
const { data: gasBalance } = useBalance({ address });
```

### 4. **viem**
**Purpose**: Ethereum utility library
**Used in**:
- `BasePaymentButton.tsx` - Amount parsing
- `FarcasterPaymentButton.tsx` - Amount parsing
- All files - Chain definitions

**Functions**:
```typescript
import { parseUnits, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
const amountWei = parseUnits("1.00", 6); // 1,000,000
```

### 5. **react** (Core)
**Purpose**: React hooks for state management
**Used in**: All components
```typescript
import { useEffect, useMemo, useRef, useCallback } from 'react';
```

---

## 🔄 Complete Payment Flow

### Environment Detection
```typescript
// UnifiedPaymentButton.tsx uses:
const environmentInfo = useEnvironmentDetection();

// Returns: { environment: 'farcaster' | 'base' | 'external' }
```

### Scenario A: Base App Mini App

```
1. UnifiedPaymentButton detects: environment = 'base'
   ↓
2. Renders: <BasePaymentButton />
   ↓
3. BasePaymentButton:
   - Uses @coinbase/onchainkit/transaction
   - Imports: Transaction, LifecycleStatus, TransactionResponseType
   - Uses wagmi hooks: useAccount, useConnect, useBalance
   - Uses viem: parseUnits, formatUnits
   ↓
4. Renders <Transaction /> component from OnchainKit
   - Props: calls, chainId, onStatus, onSuccess, onError
   ↓
5. Transaction component automatically:
   - Shows "Confirm Transaction" button
   - User approves in wallet
   - Sends transaction to blockchain
   - Waits for mining
   - Calls onSuccess with receipt
   ↓
6. handleTransactionSuccess callback:
   - Extracts transaction hash
   - Calls parent's onSuccess(transactionHash)
   ↓
7. DebateForm receives transaction hash
   - Calls backend to verify payment
   - Auto-submits cast if payment verified
```

### Scenario B: Farcaster Mini App

```
1. UnifiedPaymentButton detects: environment = 'farcaster'
   ↓
2. Renders: <FarcasterPaymentButton />
   ↓
3. FarcasterPaymentButton:
   - Uses @farcaster/miniapp-sdk
   - Uses viem: parseUnits
   - No OnchainKit, no wagmi
   ↓
4. Manual transaction flow:
   a) Gets Ethereum provider: await sdk.wallet.getEthereumProvider()
   b) Encodes transfer: 0xa9059cbb + recipient (padded) + amount (padded)
   c) Sends transaction: eth_sendTransaction
   d) Polls for receipt: eth_getTransactionReceipt
   e) Calls onSuccess on success
   ↓
5. Same as Base App flow from step 6
```

### Scenario C: External Browser

```
1. UnifiedPaymentButton detects: environment = 'external'
   ↓
2. Renders: <BasePaymentButton />
   ↓
3. Same flow as Base App Mini App (Scenario A)
   - Uses OnchainKit Transaction component
   - Uses wagmi for wallet connection
   - Uses viem for amount parsing
```

---

## 🔧 Component Details

### 1. UnifiedPaymentButton (Router)
**File**: `components/UnifiedPaymentButton.tsx`
**Dependencies**: None (just React + useEnvironmentDetection hook)
**Purpose**: Routes to correct payment component based on environment

**Code**:
```typescript
import BasePaymentButton from './BasePaymentButton';
import FarcasterPaymentButton from './FarcasterPaymentButton';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';

switch (environmentInfo.environment) {
  case 'farcaster':
    return <FarcasterPaymentButton />
  case 'base':
  case 'external':
    return <BasePaymentButton />
}
```

### 2. BasePaymentButton (OnchainKit)
**File**: `components/BasePaymentButton.tsx`
**Dependencies**: 
- `@coinbase/onchainkit/transaction`
- `wagmi` (useAccount, useConnect, useBalance)
- `viem` (parseUnits, formatUnits)

**What it does**:
1. Checks wallet connection with `useAccount()`
2. Creates USDC transfer call with `useMemo`
3. Renders OnchainKit `<Transaction />` component
4. Handles success/error with callbacks

**Key Code**:
```typescript
import { Transaction } from '@coinbase/onchainkit/transaction';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits } from 'viem';

const calls = useMemo(() => [{
  address: USDC_CONTRACT_ADDRESS,
  abi: usdcAbi,
  functionName: 'transfer',
  args: [recipientAddress, parseUnits("1.00", 6)]
}], [...]);

return <Transaction 
  calls={calls}
  chainId={84532}
  onSuccess={handleTransactionSuccess}
/>
```

### 3. FarcasterPaymentButton (Direct SDK)
**File**: `components/FarcasterPaymentButton.tsx`
**Dependencies**:
- `@farcaster/miniapp-sdk`
- `viem` (parseUnits)

**What it does**:
1. Gets Farcaster SDK's Ethereum provider
2. Manually encodes ERC20 transfer: `0xa9059cbb`
3. Sends transaction via `eth_sendTransaction`
4. Polls for receipt via `eth_getTransactionReceipt`

**Key Code**:
```typescript
import { sdk } from '@farcaster/miniapp-sdk';
import { parseUnits } from 'viem';

const ethProvider = await sdk.wallet.getEthereumProvider();
const transferData = `0xa9059cbb${recipientAddress}${amount}`;
await ethProvider.request({
  method: 'eth_sendTransaction',
  params: [{ to: USDC_CONTRACT, data: transferData }]
});
```

---

## 📊 Transaction Details

### USDC Transfer
- **Contract**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **Function**: `transfer(address to, uint256 amount)`
- **Function Selector**: `0xa9059cbb`
- **Amount**: `1,000,000` (1 USDC with 6 decimals)
- **Recipient**: `0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271` (DebatePool contract)

### Transaction Encoding
```typescript
// Transfer function signature
function transfer(address to, uint256 amount) returns (bool)

// ABI encoding
const transferData = 
  '0xa9059cbb' +                                           // Function selector
  recipientAddress.slice(2).padStart(64, '0') +           // To address (32 bytes)
  parseUnits("1.00", 6).toString(16).padStart(64, '0')   // Amount (32 bytes)

// Example:
// 0xa9059cbb
// 0000000000000000000000006d00f9f5c6a57b46bfa26e032d60b525a1dae271
// 00000000000000000000000000000000000000000000000000000000000f4240
```

---

## 🎯 Key Differences

| Aspect | BasePaymentButton (OnchainKit) | FarcasterPaymentButton |
|--------|-------------------------------|------------------------|
| **Library** | `@coinbase/onchainkit` | `@farcaster/miniapp-sdk` |
| **Transaction** | Automatic via `<Transaction />` | Manual via `eth_sendTransaction` |
| **Encoding** | Automatic via `calls` prop | Manual ERC20 encoding |
| **Status** | Callbacks: onStatus, onSuccess | Polling: eth_getTransactionReceipt |
| **Gas** | Auto-estimated | Fixed: 30,000 |
| **Confirmation** | Automatic | Manual polling loop |

---

## 🔍 Why Two Approaches?

1. **Farcaster Mini App**: Uses Farcaster's native wallet, requires SDK
2. **Base App Mini App**: Uses Coinbase wallet, can use OnchainKit
3. **External Browser**: Uses MetaMask/Coinbase Wallet, uses OnchainKit

Both send the same transaction to the same smart contract, just different tools for different environments.

