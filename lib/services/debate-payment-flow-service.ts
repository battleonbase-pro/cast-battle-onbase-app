import { paymentVerificationService } from './payment-verification-service';

export interface DebatePaymentFlow {
  success: boolean;
  transactionId?: string;
  error?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}

/**
 * Debate Payment Flow Service
 * Orchestrates the complete payment flow for debate participation
 */
export class DebatePaymentFlowService {
  private readonly debateId: number;

  constructor(debateId: number) {
    this.debateId = debateId;
  }

  /**
   * Execute complete payment flow for debate participation
   * @param userAddress User's wallet address
   * @returns Payment flow result
   */
  async executePaymentFlow(userAddress: string): Promise<DebatePaymentFlow> {
    try {
      console.log(`🎯 Starting payment flow for debate ${this.debateId}, user: ${userAddress}`);

      // Step 1: Initialize verification service
      await paymentVerificationService.initialize();

      // Step 2: Check if user is already a participant
      const isAlreadyParticipant = await paymentVerificationService.isParticipant(this.debateId, userAddress);
      if (isAlreadyParticipant) {
        console.log(`✅ User ${userAddress} already participating in debate ${this.debateId}`);
        return {
          success: true,
          verificationStatus: 'verified'
        };
      }

      // Step 3: Check USDC balance
      const hasBalance = await paymentVerificationService.checkUSDCBalance(userAddress, "1.00");
      if (!hasBalance) {
        const balance = await paymentVerificationService.getUSDCBalance(userAddress);
        return {
          success: false,
          error: `Insufficient USDC balance. Required: 1.00 USDC, Available: ${balance} USDC`
        };
      }

      // Step 4: Process payment
      const paymentResult = await usdcPaymentService.processDebatePayment(this.debateId);
      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error
        };
      }

      // Step 5: Wait for payment completion
      console.log(`⏳ Waiting for payment completion: ${paymentResult.transactionId}`);
      const paymentStatus = await usdcPaymentService.waitForPaymentCompletion(
        paymentResult.transactionId!,
        30000 // 30 second timeout
      );

      if (paymentStatus.status === 'failed') {
        return {
          success: false,
          transactionId: paymentResult.transactionId,
          error: 'Payment failed or timed out',
          verificationStatus: 'failed'
        };
      }

      // Step 6: Verify payment on-chain
      console.log(`🔍 Verifying payment on-chain...`);
      const isVerified = await paymentVerificationService.verifyPayment(this.debateId, userAddress);
      
      if (isVerified) {
        console.log(`✅ Payment verified! User ${userAddress} is now participating in debate ${this.debateId}`);
        return {
          success: true,
          transactionId: paymentResult.transactionId,
          verificationStatus: 'verified'
        };
      } else {
        console.log(`⚠️ Payment completed but verification failed`);
        return {
          success: false,
          transactionId: paymentResult.transactionId,
          error: 'Payment completed but verification failed',
          verificationStatus: 'failed'
        };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Payment flow failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Wait for transaction confirmation with x402-optimized timing
   * @param transactionId Transaction hash to wait for
   */
  private async waitForTransactionConfirmation(transactionId: string): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds maximum (x402 standard)
    const checkInterval = 1000; // Check every 1 second
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Initialize verification service to get provider
        await paymentVerificationService.initialize();
        
        // Quick check if transaction exists and is confirmed
        const isConfirmed = await paymentVerificationService.isTransactionConfirmed(transactionId);
        
        if (isConfirmed) {
          console.log(`✅ Transaction confirmed in ${Date.now() - startTime}ms (x402 optimized)`);
          return;
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (error) {
        console.log(`🔍 Confirmation check failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    console.log(`⚠️ Transaction confirmation timeout after ${maxWaitTime}ms`);
  }

  /**
   * Check payment status without processing new payment
   * @param transactionId Existing transaction ID (could be OnchainKit hash or Base Pay ID)
   * @param userAddress User's wallet address
   */
  async checkExistingPayment(transactionId: string, userAddress: string): Promise<DebatePaymentFlow> {
    try {
      console.log(`🔍 Checking existing payment: ${transactionId}`);

      // Initialize verification service
      await paymentVerificationService.initialize();

      // Check if this looks like an OnchainKit transaction hash (starts with 0x and is 66 chars)
      const isOnchainKitHash = transactionId.startsWith('0x') && transactionId.length === 66;
      
      if (isOnchainKitHash) {
        console.log(`🔗 Detected OnchainKit transaction hash: ${transactionId}`);
        
        // For OnchainKit transactions, verify on-chain using proper verification
        console.log(`⏳ Waiting for transaction confirmation (x402 optimized)...`);
        await this.waitForTransactionConfirmation(transactionId);
        
        try {
          // Use proper on-chain verification instead of trusting frontend
          const isVerified = await paymentVerificationService.verifyOnChainTransaction(transactionId, userAddress, this.debateId);
          
          if (isVerified) {
            console.log(`✅ OnchainKit transaction verified on-chain: ${transactionId}`);
            return {
              success: true,
              transactionId,
              verificationStatus: 'verified'
            };
          } else {
            console.log(`⚠️ OnchainKit transaction not yet verified: ${transactionId}`);
            return {
              success: false,
              transactionId,
              error: 'Transaction not yet confirmed on-chain',
              verificationStatus: 'pending'
            };
          }
        } catch (verificationError) {
          console.error(`❌ Failed to verify OnchainKit transaction: ${verificationError}`);
          return {
            success: false,
            transactionId,
            error: 'Failed to verify transaction on-chain',
            verificationStatus: 'failed'
          };
        }
      } else {
        // Unknown transaction ID format
        console.log(`⚠️ Unknown transaction ID format: ${transactionId}`);
        return {
          success: false,
          transactionId,
          error: 'Invalid transaction ID format',
          verificationStatus: 'failed'
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to check existing payment:', errorMessage);
      
      return {
        success: false,
        transactionId,
        error: errorMessage
      };
    }
  }

  /**
   * Get debate details
   */
  async getDebateDetails() {
    await paymentVerificationService.initialize();
    return await paymentVerificationService.getDebateDetails(this.debateId);
  }

  /**
   * Check if user can participate (has balance and debate is active)
   * For cast submissions, we always require payment unless they've already paid on-chain
   * @param userAddress User's wallet address
   */
  async canParticipate(userAddress: string): Promise<{ canParticipate: boolean; reason?: string }> {
    try {
      await paymentVerificationService.initialize();

      // Check if already participating on-chain (has paid)
      const isAlreadyParticipant = await paymentVerificationService.isParticipant(this.debateId, userAddress);
      if (isAlreadyParticipant) {
        console.log(`✅ User ${userAddress} already paid and participating in debate ${this.debateId}`);
        return { canParticipate: true };
      }

      // Check USDC balance
      const hasBalance = await paymentVerificationService.checkUSDCBalance(userAddress, "1.00");
      if (!hasBalance) {
        const balance = await paymentVerificationService.getUSDCBalance(userAddress);
        return { 
          canParticipate: false, 
          reason: `Insufficient USDC balance. Required: 1.00 USDC, Available: ${balance} USDC` 
        };
      }

      // Check debate status
      const debate = await paymentVerificationService.getDebateDetails(this.debateId);
      if (!debate.isActive) {
        return { 
          canParticipate: false, 
          reason: 'Debate is not active' 
        };
      }

      // User has balance and debate is active, but hasn't paid yet
      return { 
        canParticipate: false, 
        reason: 'Payment required to join debate' 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        canParticipate: false, 
        reason: `Unable to check participation status: ${errorMessage}` 
      };
    }
  }
}
