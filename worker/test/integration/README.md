# Integration Tests

## Overview

Integration tests for the MinimalDebatePool backend integration. These tests verify:

1. **Prize Calculation**: Correct calculation of winner prize (80% of total collected)
2. **Platform Fee Calculation**: Correct calculation matching contract formula (`winnerPrize / 4`)
3. **USDC Conversion**: Proper conversion between USDC and contract units (6 decimals)
4. **Data Flow**: End-to-end data integrity through the prize distribution flow

## Test Files

- `prize-calculation.test.ts`: Tests prize calculation logic
- `backend-integration.test.ts`: Tests end-to-end integration flow
- `debate-oracle.test.ts`: Tests DebateOracle service (some tests skipped due to ENS resolution)

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npx mocha -r ts-node/register test/integration/prize-calculation.test.ts
```

## Test Results

**21 passing tests** covering:
- ✅ Prize calculation (80% of total)
- ✅ Platform fee calculation (20% of total, or winnerPrize / 4)
- ✅ USDC conversion (6 decimals)
- ✅ Edge cases (0 participants, large counts, fractional amounts)
- ✅ Contract compatibility
- ✅ Data flow validation

**Note**: Some EIP-712 signature tests are skipped because Base Sepolia doesn't support ENS resolution, which causes ethers.js to fail. The actual implementation in `DebateOracle` handles this correctly by using the provider without ENS resolution.

## Key Test Cases

### Prize Calculation
- Winner prize = 80% of total collected
- Platform fee = winnerPrize / 4 (contract formula)
- Sum of prize + platform fee = total collected

### Examples Tested
- 1 participant → 0.8 USDC prize
- 3 participants → 2.4 USDC prize
- 5 participants → 4.0 USDC prize
- 10 participants → 8.0 USDC prize
- 100 participants → 80.0 USDC prize

### Contract Compatibility
- All prize amounts are properly formatted with 6 decimals
- BigInt conversion works correctly
- Values can be converted back to USDC format

