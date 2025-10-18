import { usdcPaymentService, PaymentResult } from './usdc-payment-service';
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
   * Check payment status without processing new payment
   * @param transactionId Existing transaction ID
   * @param userAddress User's wallet address
   */
  async checkExistingPayment(transactionId: string, userAddress: string): Promise<DebatePaymentFlow> {
    try {
      console.log(`🔍 Checking existing payment: ${transactionId}`);

      // Initialize verification service
      await paymentVerificationService.initialize();

      // Check payment status
      const paymentStatus = await usdcPaymentService.checkPaymentStatus(transactionId);
      
      if (paymentStatus.status === 'completed') {
        console.log(`✅ Base Pay payment completed: ${transactionId}`);
        
        // For Base Pay transactions, trust the payment status from the SDK
        // On-chain verification might take time or work differently
        return {
          success: true,
          transactionId,
          verificationStatus: 'verified'
        };
      } else if (paymentStatus.status === 'failed') {
        return {
          success: false,
          transactionId,
          error: 'Payment failed',
          verificationStatus: 'failed'
        };
      } else {
        return {
          success: false,
          transactionId,
          error: 'Payment still pending',
          verificationStatus: 'pending'
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
