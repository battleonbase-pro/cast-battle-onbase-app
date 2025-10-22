import { environmentDetector } from '../utils/environment-detector';
import { farcasterAuthService } from './farcaster-auth-service';
import { baseAccountAuthService } from './base-account-auth-service';

export interface PaymentOptions {
  amount: string;
  recipientAddress: string;
  onTransactionHash?: (hash: string) => void;
  onError?: (error: Error) => void;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class PaymentService {
  private static instance: PaymentService;

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Process payment using the appropriate service based on environment
   */
  async processPayment(options: PaymentOptions): Promise<PaymentResult> {
    try {
      console.log('💰 Processing payment...');
      
      // Detect environment
      const environment = await environmentDetector.detectEnvironment();
      console.log('🌐 Payment environment:', environment);

      switch (environment) {
        case 'farcaster':
          return await this.processFarcasterPayment(options);
        case 'base':
        case 'external':
        default:
          return await this.processBasePayment(options);
      }

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Payment processing failed:', err);
      
      if (options.onError) {
        options.onError(err);
      }
      
      return {
        success: false,
        error: err.message || 'Payment failed'
      };
    }
  }

  /**
   * Process payment using Farcaster's native wallet
   */
  private async processFarcasterPayment(options: PaymentOptions): Promise<PaymentResult> {
    console.log('🔗 Processing Farcaster payment...');
    
    if (!farcasterAuthService.isAuthenticated()) {
      return {
        success: false,
        error: 'Farcaster user not authenticated'
      };
    }

    return await farcasterAuthService.sendUSDCPayment({
      amount: options.amount,
      recipientAddress: options.recipientAddress,
      onTransactionHash: options.onTransactionHash,
      onError: options.onError
    });
  }

  /**
   * Process payment using Base Pay SDK
   */
  private async processBasePayment(options: PaymentOptions): Promise<PaymentResult> {
    console.log('🔵 Processing Base payment...');
    
    if (!baseAccountAuthService.isAuthenticated()) {
      return {
        success: false,
        error: 'Base Account user not authenticated'
      };
    }

    try {
      // Use Base Pay SDK for payment
      const result = await baseAccountAuthService.joinDebateWithPayment(
        2, // Default debate ID
        options.amount
      );

      if (result.success && result.transactionHash) {
        if (options.onTransactionHash) {
          options.onTransactionHash(result.transactionHash);
        }
      }

      return result;

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Base payment failed:', err);
      
      if (options.onError) {
        options.onError(err);
      }
      
      return {
        success: false,
        error: err.message || 'Base payment failed'
      };
    }
  }

  /**
   * Check if payment is supported in current environment
   */
  async isPaymentSupported(): Promise<boolean> {
    try {
      const environment = await environmentDetector.detectEnvironment();
      
      switch (environment) {
        case 'farcaster':
          return farcasterAuthService.isAuthenticated();
        case 'base':
        case 'external':
        default:
          return baseAccountAuthService.isAuthenticated();
      }
    } catch (error) {
      console.error('❌ Error checking payment support:', error);
      return false;
    }
  }

  /**
   * Get payment capabilities for current environment
   */
  async getPaymentCapabilities(): Promise<{
    gasFree: boolean;
    supported: boolean;
    method: string;
  }> {
    try {
      const environment = await environmentDetector.detectEnvironment();
      
      switch (environment) {
        case 'farcaster':
          return {
            gasFree: false, // Farcaster payments use gas
            supported: farcasterAuthService.isAuthenticated(),
            method: 'Farcaster Native Wallet'
          };
        case 'base':
        case 'external':
        default:
          return {
            gasFree: true, // Base Pay SDK handles gas
            supported: baseAccountAuthService.isAuthenticated(),
            method: 'Base Pay SDK'
          };
      }
    } catch (error) {
      console.error('❌ Error getting payment capabilities:', error);
      return {
        gasFree: false,
        supported: false,
        method: 'Unknown'
      };
    }
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();