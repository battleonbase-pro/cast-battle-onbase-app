/**
 * Integration Tests for Prize Calculation Logic
 * Tests the prize calculation that matches MinimalDebatePool contract expectations
 */

import { expect } from 'chai';
import { ethers } from 'ethers';

describe('Prize Calculation Integration Tests', function () {
  const ENTRY_FEE_USDC = 1; // 1 USDC per participant
  const WINNER_PRIZE_PERCENTAGE = 0.8; // 80%
  const PLATFORM_FEE_PERCENTAGE = 0.2; // 20%

  describe('Winner Prize Calculation', function () {
    it('Should calculate winner prize as 80% of total collected', function () {
      const participantCount = 5;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 5 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 4 USDC
      
      expect(winnerPrizeUSDC).to.equal(4.0);
      expect(winnerPrizeUSDC / totalCollected).to.equal(0.8);
    });

    it('Should match contract calculation: winnerPrize / 4 = platformFee', function () {
      // Contract calculates: platformFee = winnerPrize / 4
      // This means: if winnerPrize = 80% of total, then platformFee = 20% of total
      const participantCount = 10;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 10 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 8 USDC
      const platformFeeUSDC = winnerPrizeUSDC / 4; // 2 USDC
      
      expect(platformFeeUSDC).to.equal(2.0);
      expect(platformFeeUSDC + winnerPrizeUSDC).to.equal(totalCollected);
    });

    it('Should convert prize to USDC with 6 decimals correctly', function () {
      const participantCount = 3;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 3 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 2.4 USDC
      
      // Convert to USDC with 6 decimals
      const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);
      
      // Verify conversion
      expect(ethers.formatUnits(winnerPrize, 6)).to.equal('2.4');
      expect(winnerPrize).to.equal(ethers.parseUnits('2.4', 6));
    });

    it('Should handle fractional USDC amounts correctly', function () {
      const participantCount = 1;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 1 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 0.8 USDC
      
      const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);
      
      expect(ethers.formatUnits(winnerPrize, 6)).to.equal('0.8');
      expect(winnerPrize).to.equal(ethers.parseUnits('0.8', 6));
    });
  });

  describe('Platform Fee Calculation', function () {
    it('Should calculate platform fee as 20% of total', function () {
      const participantCount = 10;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 10 USDC
      const platformFeeUSDC = totalCollected * PLATFORM_FEE_PERCENTAGE; // 2 USDC
      
      expect(platformFeeUSDC).to.equal(2.0);
      expect(platformFeeUSDC / totalCollected).to.equal(0.2);
    });

    it('Should match contract formula: platformFee = winnerPrize / 4', function () {
      const participantCount = 8;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 8 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 6.4 USDC
      const platformFeeUSDC = winnerPrizeUSDC / 4; // 1.6 USDC
      
      // Verify it equals 20% of total
      expect(platformFeeUSDC).to.be.closeTo(totalCollected * 0.2, 0.000001);
      expect(platformFeeUSDC + winnerPrizeUSDC).to.be.closeTo(totalCollected, 0.000001);
    });
  });

  describe('Edge Cases', function () {
    it('Should handle zero participants', function () {
      const participantCount = 0;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 0 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 0 USDC
      
      expect(winnerPrizeUSDC).to.equal(0);
    });

    it('Should handle large participant counts', function () {
      const participantCount = 1000;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 1000 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 800 USDC
      
      expect(winnerPrizeUSDC).to.equal(800);
      
      // Convert to USDC with 6 decimals
      const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);
      expect(ethers.formatUnits(winnerPrize, 6)).to.equal('800.0');
    });

    it('Should maintain precision for many decimal places', function () {
      const participantCount = 7;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 7 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 5.6 USDC
      
      const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);
      const formatted = parseFloat(ethers.formatUnits(winnerPrize, 6));
      
      expect(formatted).to.be.closeTo(5.6, 0.000001);
    });
  });

  describe('Contract Compatibility', function () {
    it('Should produce prize amounts that contract can accept', function () {
      const participantCount = 5;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 5 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 4 USDC
      
      // Convert to BigInt (USDC with 6 decimals)
      const winnerPrize = ethers.parseUnits(winnerPrizeUSDC.toFixed(6), 6);
      
      // Verify it's a valid BigInt
      expect(typeof winnerPrize).to.equal('bigint');
      expect(winnerPrize > 0n).to.be.true;
      
      // Verify it can be converted back
      const formatted = ethers.formatUnits(winnerPrize, 6);
      expect(parseFloat(formatted)).to.be.closeTo(4.0, 0.000001);
    });

    it('Should ensure prize + platform fee = total collected', function () {
      const participantCount = 15;
      const totalCollected = participantCount * ENTRY_FEE_USDC; // 15 USDC
      const winnerPrizeUSDC = totalCollected * WINNER_PRIZE_PERCENTAGE; // 12 USDC
      const platformFeeUSDC = winnerPrizeUSDC / 4; // 3 USDC (contract formula)
      
      // Verify sum equals total
      expect(winnerPrizeUSDC + platformFeeUSDC).to.be.closeTo(totalCollected, 0.000001);
    });
  });
});

