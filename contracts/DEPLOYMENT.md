# Base Sepolia Deployment Guide

This guide will help you deploy the DebatePool smart contract to Base Sepolia and integrate it with your existing app.

## Prerequisites

1. **Base Sepolia Testnet Access**
   - Get Base Sepolia ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Get Base Sepolia USDC from [Circle Faucet](https://faucet.circle.com/)

2. **Environment Setup**
   - Node.js 18+
   - Hardhat
   - Wallet with Base Sepolia ETH for gas fees

## Step 1: Contract Deployment

### 1.1 Install Dependencies

```bash
cd contracts
npm install
```

### 1.2 Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your values:
```bash
# Your deployer wallet private key (keep secure!)
PRIVATE_KEY=your_private_key_here

# Oracle address (your backend wallet for signing results)
ORACLE_ADDRESS=0x0000000000000000000000000000000000000000

# Basescan API key for contract verification (optional)
BASESCAN_API_KEY=your_basescan_api_key_here
```

### 1.3 Deploy Contract

```bash
npm run deploy:sepolia
```

This will:
- Deploy DebatePool contract to Base Sepolia
- Use Base Sepolia USDC address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Set your oracle address for signing winner results

### 1.4 Verify Contract (Optional)

```bash
npm run verify:sepolia
```

## Step 2: Backend Integration

### 2.1 Update Worker Environment

Add to your worker `.env`:

```bash
# Base Sepolia RPC
BASE_SEPOLIA_RPC=https://sepolia.base.org

# Oracle private key (same as ORACLE_ADDRESS from deployment)
ORACLE_PRIVATE_KEY=your_oracle_private_key_here

# Contract address (from deployment output)
DEBATE_POOL_CONTRACT_ADDRESS=0x...
```

### 2.2 Test Oracle Integration

The oracle will automatically:
- Sign winner results using EIP-712
- Call `declareWinner()` on the contract
- Distribute USDC rewards to winners

## Step 3: Frontend Integration

### 3.1 Update Frontend Environment

Add to your frontend `.env.local`:

```bash
# Contract address (from deployment output)
NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=0x...
```

### 3.2 Install Frontend Dependencies

```bash
npm install ethers
```

### 3.3 Use USDCPayment Component

```tsx
import USDCPayment from '@/components/USDCPayment';

// In your debate page
<USDCPayment
  debateId={1}
  entryFee="1"
  onPaymentSuccess={(txHash) => console.log('Payment successful:', txHash)}
  onPaymentError={(error) => console.error('Payment failed:', error)}
/>
```

## Step 4: Testing the Complete Flow

### 4.1 Create a Test Debate

```bash
# Using Hardhat console
npx hardhat console --network baseSepolia

# In console:
const DebatePool = await ethers.getContractFactory("DebatePool");
const debatePool = await DebatePool.attach("YOUR_CONTRACT_ADDRESS");
await debatePool.createDebate("Test Debate", ethers.parseUnits("1", 6), 3, 3600);
```

### 4.2 Test User Flow

1. **User connects wallet** → Frontend detects Base Sepolia
2. **User joins debate** → Pays 1 USDC entry fee
3. **Debate completes** → AI judges and picks winner
4. **Oracle signs result** → Backend calls `declareWinner()`
5. **Winner gets paid** → 90% of pool goes to winner, 10% to platform

## Step 5: Production Considerations

### 5.1 Security

- **Oracle Key Management**: Use hardware wallets or secure key management
- **Multi-sig**: Consider multi-sig for contract ownership
- **Access Control**: Implement proper role-based access

### 5.2 Monitoring

- **Contract Events**: Monitor `WinnerDeclared` events
- **Failed Transactions**: Track failed oracle calls
- **Balance Monitoring**: Monitor contract USDC balance

### 5.3 Gas Optimization

- **Batch Operations**: Group multiple operations
- **Gas Estimation**: Estimate gas before transactions
- **Fallback Mechanisms**: Handle gas price spikes

## Contract Addresses

### Base Sepolia
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **DebatePool**: `0x...` (your deployed address)

### Base Mainnet (Future)
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **DebatePool**: `0x...` (to be deployed)

## Troubleshooting

### Common Issues

1. **"Insufficient USDC Balance"**
   - Get test USDC from Circle faucet
   - Check wallet has Base Sepolia USDC

2. **"Oracle not authorized"**
   - Verify ORACLE_ADDRESS matches deployed contract
   - Check oracle wallet has gas for transactions

3. **"Contract not initialized"**
   - Verify NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS is set
   - Check contract is deployed and verified

### Support

- **Base Docs**: [docs.base.org](https://docs.base.org)
- **Base Discord**: [discord.gg/buildonbase](https://discord.gg/buildonbase)
- **Contract Issues**: Check Basescan for transaction details

## Next Steps

1. **Deploy to Base Mainnet** when ready for production
2. **Add Governance Features** for community management
3. **Implement NFT Rewards** for winners
4. **Create Mobile App** with Base Account SDK
5. **Add Analytics Dashboard** for platform metrics
