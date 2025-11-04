# Platform Fee Calculation - Simple Explanation

## The Core Concept

**When a debate ends, the money collected is split:**
- **Winner gets: 80%** of the total
- **Platform gets: 20%** of the total

## The Problem

The contract receives `winnerPrize` (which is 80% of the total), but we need to calculate the platform fee (20% of the total).

## The Solution

If the winner gets 80% and we need to find 20%, we can use simple math:

### Visual Breakdown:

```
Total Collected: 100 USDC
├── Winner Prize: 80 USDC (80%)
└── Platform Fee: 20 USDC (20%)
```

### The Math:

**If winner gets 80% and platform gets 20%:**
- Winner:Platform ratio = 80:20 = 4:1
- This means: **Platform fee = Winner prize ÷ 4**

### Why Divide by 4?

Because 80% is **4 times bigger** than 20%:
- 80% = 4 × 20%
- So: 20% = 80% ÷ 4

## Concrete Examples

### Example 1:
- **Total collected**: 2 USDC
- **Winner prize** (80%): 1.6 USDC
- **Platform fee calculation**: 1.6 ÷ 4 = **0.4 USDC** ✅
- **Check**: 1.6 + 0.4 = 2.0 USDC ✅

### Example 2:
- **Total collected**: 10 USDC
- **Winner prize** (80%): 8 USDC
- **Platform fee calculation**: 8 ÷ 4 = **2 USDC** ✅
- **Check**: 8 + 2 = 10 USDC ✅

### Example 3:
- **Total collected**: 5 USDC
- **Winner prize** (80%): 4 USDC
- **Platform fee calculation**: 4 ÷ 4 = **1 USDC** ✅
- **Check**: 4 + 1 = 5 USDC ✅

## The Code

```solidity
// Winner prize is 80% of total
// Platform fee is 20% of total
// Since 80% = 4 × 20%, we can calculate:
uint256 calculatedPlatformFee = winnerPrize / 4;
```

**That's it!** Just divide the winner prize by 4.

## What Was Wrong Before?

The old code tried to use a complex formula:
```solidity
// ❌ OLD (WRONG):
platformFee = (winnerPrize * 20) / 9980
```

This gave **wrong results** (way too small).

## What's Right Now?

```solidity
// ✅ NEW (CORRECT):
calculatedPlatformFee = winnerPrize / 4
```

This gives **correct results** every time.

## Summary

**Question**: How do we calculate 20% if we know 80%?

**Answer**: Divide by 4!

- Winner gets 80% = 4 parts
- Platform gets 20% = 1 part
- **Platform fee = Winner prize ÷ 4**

It's that simple! 🎯

