import { createBaseAccountSDK, pay } from '@base-org/account';

export interface BaseAccountUser {
  address: string;
  email?: string;
  name?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class BaseAccountService {
  private sdk: any = null;
  private provider: any = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (typeof window !== 'undefined') {
        this.sdk = createBaseAccountSDK({
          appName: 'Cast Battle',
          appIcon: '/icon.png',
          appDescription: 'AI-Powered Debate Battles on Base'
        });
        this.provider = this.sdk.getProvider();
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
    return this.isInitialized && this.provider !== null;
  }

  /**
   * Check if user is signed in
   * Note: Base Account SDK handles authentication automatically during payments
   */
  async isSignedIn(): Promise<boolean> {
    // Base Account SDK handles authentication automatically
    // We can't check sign-in status without attempting a payment
    return this.isAvailable();
  }

  /**
   * Sign in with Base Account
   * Note: Base Account SDK handles authentication automatically during payments
   */
  async signIn(): Promise<BaseAccountUser> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    // Base Account SDK handles authentication automatically
    // Return a placeholder user object
    return {
      address: '0x0000000000000000000000000000000000000000',
      email: 'user@base.org',
      name: 'Base Account User'
    };
  }

  /**
   * Get current Base Account
   * Note: Base Account SDK handles authentication automatically during payments
   */
  async getBaseAccount(): Promise<BaseAccountUser> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    // Base Account SDK handles authentication automatically
    // Return a placeholder user object
    return {
      address: '0x0000000000000000000000000000000000000000',
      email: 'user@base.org',
      name: 'Base Account User'
    };
  }

  /**
   * Sign out
   * Note: Base Account SDK handles authentication automatically
   */
  async signOut(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    // Base Account SDK handles authentication automatically
    console.log('✅ Base Account SDK handles authentication automatically');
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
        amount: amount,
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      console.log('✅ USDC payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.id
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
        amount: entryFee,
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      console.log('✅ Debate payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.id
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