import { createBaseAccountSDK, pay, getPaymentStatus } from '@base-org/account';

export interface BaseAccountUser {
  address: string;
  email?: string;
  name?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  paymentId?: string;
  error?: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
}

export class BaseAccountService {
  private sdk: any = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (typeof window !== 'undefined') {
        this.sdk = createBaseAccountSDK({
          appName: 'Cast Battle',
          appLogoUrl: '/icon.png', // Make sure this exists in public folder
        });
        this.isInitialized = true;
        console.log('✅ Base Account SDK initialized');
      }
    } catch (error) {
      console.log('⚠️ Base Account SDK not available:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Base Account SDK is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.sdk !== null;
  }

  /**
   * Get the SDK instance for direct use
   */
  getSDK() {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }
    return this.sdk;
  }

  /**
   * Sign in with Base Account (optional - not required for payments)
   */
  async signIn(): Promise<BaseAccountUser> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      await this.sdk.getProvider().request({ method: 'wallet_connect' });
      
      // Return a placeholder user object since we can't get actual user data
      return {
        address: '0x0000000000000000000000000000000000000000',
        email: 'user@base.org',
        name: 'Base Account User'
      };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      // Try to get provider to check if connected
      const provider = this.sdk.getProvider();
      return provider !== null;
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      return false;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      // Base Account SDK handles authentication automatically
      console.log('✅ Base Account SDK handles authentication automatically');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Make a USDC payment using Base Account
   */
  async payUSDC(recipient: string, amount: string, memo?: string): Promise<PaymentResult> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      console.log(`💰 Making USDC payment: ${amount} USDC to ${recipient}`);
      
      const result = await pay({
        to: recipient as `0x${string}`,
        amount: amount, // Amount in USD - SDK quotes equivalent USDC
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      console.log('✅ USDC payment successful:', result);
      
      return {
        success: true,
        paymentId: result.id,
        transactionHash: result.id // Use payment ID as transaction hash
      };
    } catch (error: any) {
      console.error('❌ USDC payment failed:', error);
      
      return {
        success: false,
        error: error.message || 'Payment failed'
      };
    }
  }

  /**
   * Join debate with USDC payment
   */
  async joinDebateWithPayment(debateId: number, entryFee: string): Promise<PaymentResult> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      // Get contract address from environment
      const contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      console.log(`🎯 Joining debate ${debateId} with ${entryFee} USDC payment`);
      
      const result = await pay({
        to: contractAddress as `0x${string}`,
        amount: entryFee, // Amount in USD - SDK quotes equivalent USDC
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      console.log('✅ Debate payment successful:', result);
      
      return {
        success: true,
        paymentId: result.id,
        transactionHash: result.id // Use payment ID as transaction hash
      };
    } catch (error: any) {
      console.error('❌ Debate payment failed:', error);
      
      return {
        success: false,
        error: error.message || 'Debate payment failed'
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const result = await getPaymentStatus({ id: paymentId });
      return {
        id: paymentId,
        status: result.status
      };
    } catch (error: any) {
      console.error('❌ Failed to get payment status:', error);
      throw error;
    }
  }

  /**
   * Get user's USDC balance
   * Note: Base Account SDK doesn't provide balance checking
   */
  async getUSDCBalance(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    // Base Account SDK doesn't provide balance checking
    // Return a placeholder balance
    console.log('⚠️ Base Account SDK doesn\'t provide balance checking');
    return '0';
  }

  /**
   * Check if user has sufficient USDC balance
   * Note: Base Account SDK doesn't provide balance checking
   */
  async hasSufficientBalance(requiredAmount: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    // Base Account SDK doesn't provide balance checking
    // Assume sufficient balance and let the payment fail if insufficient
    console.log('⚠️ Base Account SDK doesn\'t provide balance checking, assuming sufficient balance');
    return true;
  }
}

// Export singleton instance
export const baseAccountService = new BaseAccountService();

// Export factory function for testing
export function createBaseAccountService(): BaseAccountService {
  return new BaseAccountService();
}