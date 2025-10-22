# Environment Variables Documentation

## Required Environment Variables

### Contract Addresses (Base Sepolia Testnet)
```bash
# DebatePool contract address (deployed on Base Sepolia)
NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271

# USDC contract address (Base Sepolia testnet)
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Network configuration
NEXT_PUBLIC_NETWORK=testnet
```

### Project Configuration
```bash
# Project name for branding
NEXT_PUBLIC_PROJECT_NAME=cast-battle-onbase

# Battle configuration
BATTLE_GENERATION_ENABLED=true
BATTLE_DURATION_HOURS=4
BATTLE_MAX_PARTICIPANTS=100
```

### News Service Configuration
```bash
# News source (serper, newsapi, etc.)
NEWS_SOURCE=serper

# Serper API key for news fetching
SERPER_API_KEY=your_serper_api_key_here
```

### Database Configuration
```bash
# PostgreSQL database URL
DATABASE_URL=postgresql://username:password@localhost:5432/cast_battle_db
```

### Authentication & Security
```bash
# JWT secret for session management
JWT_SECRET=your_jwt_secret_here

# Base Account SDK configuration
BASE_ACCOUNT_SDK_APP_ID=your_base_account_app_id
```

### Deployment Configuration
```bash
# Environment (development, production)
NODE_ENV=development
```

## Optional Environment Variables

```bash
# Basescan API key for contract verification (optional)
BASESCAN_API_KEY=your_basescan_api_key_here

# RPC URLs (these are public, no need to change)
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org
```

## Notes

1. **Contract addresses** are for Base Sepolia testnet
2. **For mainnet deployment**, update contract addresses accordingly
3. **Keep private keys and API keys secure** - never commit them to version control
4. **The NEXT_PUBLIC_ prefix** makes variables available in the browser
5. **Variables without NEXT_PUBLIC_** are server-side only

## Usage in Code

### Payment Verification Service
```typescript
export const CONTRACT_ADDRESSES = {
  BASE_SEPOLIA: {
    USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    DEBATE_POOL: process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || '0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271',
  },
  BASE_MAINNET: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DEBATE_POOL: '', // Will be set when deployed to mainnet
  }
};
```

### x402 Payment Required Response
```typescript
const paymentRequiredResponse = {
  x402Version: 1,
  accepts: [{
    scheme: "exact",
    network: "base-sepolia",
    maxAmountRequired: "1000000", // 1 USDC in atomic units (6 decimals)
    resource: "/api/battle/submit-cast",
    description: "Debate participation fee",
    mimeType: "application/json",
    payTo: process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || "0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271",
    maxTimeoutSeconds: 30,
    asset: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    extra: {
      name: "USD Coin",
      version: "2"
    }
  }],
  error: canParticipate.reason || 'Payment required to submit cast'
};
```
