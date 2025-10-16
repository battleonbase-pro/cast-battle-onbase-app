# DebatePool Smart Contracts

A modular, scalable smart contract system for AI-judged debates with USDC rewards on Base Sepolia.

## 🏗️ Architecture

### Core Contracts

- **`DebatePool.sol`** - Main contract managing debates, participants, and payouts
- **`IDebatePool.sol`** - Interface defining contract interactions

### Key Features

- ✅ **USDC Entry Fees** - Users pay 1 USDC to join debates
- ✅ **Automated Payouts** - Winners receive 90% of pool, platform keeps 10%
- ✅ **EIP-712 Signatures** - Oracle signs winner results for trustless verification
- ✅ **Modular Design** - Easy to extend with new features
- ✅ **Gas Optimized** - Efficient storage and operations
- ✅ **Security First** - ReentrancyGuard, access controls, input validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Base Sepolia ETH for gas fees
- Base Sepolia USDC for testing

### Installation

```bash
cd contracts
npm install
```

### Configuration

```bash
cp env.example .env
# Edit .env with your private key and oracle address
```

### Deployment

```bash
# Deploy to Base Sepolia
npm run deploy:sepolia

# Test the contract
npm run test:contract
```

## 📋 Contract Functions

### View Functions

```solidity
// Get debate details
function getDebate(uint256 debateId) external view returns (Debate memory)

// Get all active debates
function getActiveDebates() external view returns (uint256[])

// Get user's debate history
function getUserDebates(address user) external view returns (uint256[])

// Get contract USDC balance
function getContractBalance() external view returns (uint256)
```

### Write Functions

```solidity
// Create a new debate (owner only)
function createDebate(
    string memory topic,
    uint256 entryFee,
    uint256 maxParticipants,
    uint256 duration
) external returns (uint256)

// Join a debate by paying entry fee
function joinDebate(uint256 debateId) external

// Declare winner (oracle only)
function declareWinner(WinnerResult memory result) external

// Withdraw platform fees (owner only)
function withdrawFunds() external
```

## 🔐 Security Features

### Access Controls

- **Owner**: Can create debates and withdraw fees
- **Oracle**: Can declare winners (AI judge backend)
- **Participants**: Can join debates and receive rewards

### EIP-712 Signature Verification

Winner results are signed using EIP-712 typed data:

```typescript
const domain = {
  name: 'DebatePool',
  version: '1',
  chainId: 84532, // Base Sepolia
  verifyingContract: contractAddress
};

const types = {
  WinnerResult: [
    { name: 'debateId', type: 'uint256' },
    { name: 'winner', type: 'address' },
    { name: 'timestamp', type: 'uint256' }
  ]
};
```

### Reentrancy Protection

All external functions use `ReentrancyGuard` to prevent reentrancy attacks.

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Contract Testing

```bash
npm run test:contract
```

### Manual Testing

1. Deploy contract to Base Sepolia
2. Fund test wallets with USDC
3. Create test debate
4. Join debate with multiple participants
5. Declare winner using oracle
6. Verify USDC distribution

## 📊 Gas Optimization

### Storage Optimization

- Packed structs to minimize storage slots
- Efficient array operations
- Minimal state variables

### Function Optimization

- Batch operations where possible
- Early returns for invalid states
- Optimized loops and iterations

## 🔄 Integration

### Backend Integration

```typescript
import { createDebateOracle } from './debate-oracle';

const oracle = createDebateOracle();
await oracle.processBattleCompletion(battleId);
```

### Frontend Integration

```typescript
import { getContractService } from './debate-contract-service';

const contractService = getContractService();
await contractService.joinDebate(debateId);
```

## 📈 Economics

### Fee Structure

- **Entry Fee**: 1 USDC per participant
- **Winner Prize**: 80% of total pool
- **Platform Fee**: 20% of total pool

### Example Payout

```
10 participants × 1 USDC = 10 USDC total pool
Winner receives: 8 USDC (80%)
Platform receives: 2 USDC (20%)
```

## 🛠️ Development

### Adding New Features

1. **Extend Interface**: Add new functions to `IDebatePool.sol`
2. **Implement Contract**: Add logic to `DebatePool.sol`
3. **Update Tests**: Add test cases for new functionality
4. **Deploy & Test**: Deploy to testnet and verify

### Common Patterns

- **Events**: Emit events for all state changes
- **Modifiers**: Use modifiers for access control
- **Error Messages**: Provide clear error messages
- **Documentation**: Document all public functions

## 🚨 Security Considerations

### Oracle Security

- **Key Management**: Use hardware wallets for oracle keys
- **Multi-sig**: Consider multi-sig for oracle operations
- **Monitoring**: Monitor oracle transactions and signatures

### Contract Security

- **Audits**: Get professional audits before mainnet
- **Testing**: Comprehensive test coverage
- **Monitoring**: Monitor contract events and state

## 📚 Resources

- [Base Documentation](https://docs.base.org)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [EIP-712 Standard](https://eips.ethereum.org/EIPS/eip-712)
- [Hardhat Documentation](https://hardhat.org/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
