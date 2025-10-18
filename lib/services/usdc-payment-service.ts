import { pay, getPaymentStatus } from '@base-org/account';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed';
  transactionId: string;
}

/**
 * USDC Payment Service using Base Pay
 * Handles 1 USDC payments for debate participation
 */
export class USDCPaymentService {
  private readonly contractAddress: string;
  private readonly isTestnet: boolean;

  constructor() {
    this.contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS || '';
    // More explicit testnet detection
    this.isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || 
                     process.env.NODE_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_NETWORK === 'sepolia';
    
    console.log('🔧 USDCPaymentService Configuration:');
    console.log(`   Contract Address: ${this.contractAddress}`);
    console.log(`   Testnet Mode: ${this.isTestnet}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   NEXT_PUBLIC_NETWORK: ${process.env.NEXT_PUBLIC_NETWORK}`);
    
    if (!this.contractAddress) {
      throw new Error('NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS not configured');
    }
  }

  /**
   * Process 1 USDC payment for debate participation
   * @param debateId The debate ID to join
   * @returns Payment result with transaction ID
   */
  async processDebatePayment(debateId: number): Promise<PaymentResult> {
    try {
      console.log(`💰 Processing 1 USDC payment for debate ${debateId}`);
      console.log(`🔧 Payment Configuration:`);
      console.log(`   Amount: 1.00 USDC`);
      console.log(`   To: ${this.contractAddress}`);
      console.log(`   Testnet: ${this.isTestnet}`);
      
      const payment = await pay({
        amount: '1.00', // 1 USDC
        to: this.contractAddress as `0x${string}`,
        testnet: this.isTestnet
      });

      console.log(`✅ Payment initiated: ${payment.id}`);
      
      return {
        success: true,
        transactionId: payment.id
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      console.error('❌ Payment failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check payment status
   * @param transactionId Payment transaction ID
   * @returns Payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      console.log(`🔍 Checking payment status for: ${transactionId}`);
      console.log(`🔧 Status Check Configuration:`);
      console.log(`   Transaction ID: ${transactionId}`);
      console.log(`   Testnet: ${this.isTestnet}`);
      
      const status = await getPaymentStatus({
        id: transactionId,
        testnet: this.isTestnet // Must match the testnet setting from pay()
      });

      console.log(`📊 Payment Status: ${status.status}`);
      
      return {
        status: status.status as 'pending' | 'completed' | 'failed',
        transactionId
      };
    } catch (error: unknown) {
      console.error('❌ Failed to check payment status:', error);
      return {
        status: 'failed',
        transactionId
      };
    }
  }

  /**
   * Poll payment status until completion or timeout
   * @param transactionId Payment transaction ID
   * @param timeoutMs Timeout in milliseconds (default: 30 seconds)
   * @returns Final payment status
   */
  async waitForPaymentCompletion(
    transactionId: string, 
    timeoutMs: number = 30000
  ): Promise<PaymentStatus> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every 1 second

    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const status = await this.checkPaymentStatus(transactionId);
          
          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            console.warn(`⏰ Payment status check timed out for ${transactionId}`);
            resolve({
              status: 'failed',
              transactionId
            });
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          console.error('❌ Error polling payment status:', error);
          resolve({
            status: 'failed',
            transactionId
          });
        }
      };

      poll();
    });
  }

  /**
   * Get contract address for verification
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Check if running on testnet
   */
  isTestnetMode(): boolean {
    return this.isTestnet;
  }
}

// Singleton instance
export const usdcPaymentService = new USDCPaymentService();
