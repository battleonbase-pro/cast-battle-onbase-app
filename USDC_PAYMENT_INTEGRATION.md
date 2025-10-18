# USDC Payment Integration - Configuration Guide

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Base Sepolia Configuration
NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=0xD204b546020765994e8B9da58F76D9E85764a059
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_NETWORK=testnet
NODE_ENV=development
```

**Important**: The `NEXT_PUBLIC_NETWORK=testnet` setting ensures that `testnet: true` is passed to both `pay()` and `getPaymentStatus()` calls.

## Contract Details

- **Debate Pool Contract**: `0xD204b546020765994e8B9da58F76D9E85764a059`
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Entry Fee**: 1 USDC
- **Platform Fee**: 20% (0.2 USDC)
- **Winner Prize**: 80% (0.8 USDC)

## Testing on Base Sepolia

1. **Get Test USDC**: Visit [Circle Faucet](https://faucet.circle.com) and select "Base Sepolia"
2. **Connect Wallet**: Use Base Account or any Base-compatible wallet
3. **Test Payment**: Try the 1 USDC payment flow in the debate tab

## Production Configuration

For mainnet deployment, update the environment variables:

```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=<mainnet_contract_address>
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## Testing the Integration

### 1. Verify Testnet Configuration

Check the browser console for these logs when the payment service initializes:

```
🔧 USDCPaymentService Configuration:
   Contract Address: 0xD204b546020765994e8B9da58F76D9E85764a059
   Testnet Mode: true
   NODE_ENV: development
   NEXT_PUBLIC_NETWORK: testnet
```

### 2. Test Payment Flow

When you click "Pay 1 USDC", you should see:

```
💰 Processing 1 USDC payment for debate 2
🔧 Payment Configuration:
   Amount: 1.00 USDC
   To: 0xD204b546020765994e8B9da58F76D9E85764a059
   Testnet: true
✅ Payment initiated: [payment-id]
```

### 3. Test Payment Status

When checking payment status:

```
🔍 Checking payment status for: [payment-id]
🔧 Status Check Configuration:
   Transaction ID: [payment-id]
   Testnet: true
📊 Payment Status: completed
```

## Troubleshooting

If you see `Testnet Mode: false`, check your environment variables:

1. Ensure `NEXT_PUBLIC_NETWORK=testnet` is set
2. Ensure `NODE_ENV=development` is set
3. Restart your development server after changing environment variables

## Payment Flow

1. User selects Support/Oppose side
2. System checks USDC balance (requires 1 USDC)
3. User clicks "Pay 1 USDC" button
4. Base Pay processes the payment
5. System verifies payment on-chain
6. User can then submit their argument

## Error Handling

- **Insufficient Balance**: Shows current balance vs required amount
- **Payment Failed**: Allows retry with error message
- **Network Issues**: Graceful fallback with user feedback
- **Contract Verification**: On-chain verification of participation
