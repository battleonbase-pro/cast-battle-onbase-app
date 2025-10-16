import { getProvider } from '@base-org/account';

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
  private provider: any = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (typeof window !== 'undefined') {
        this.provider = await getProvider();
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
   */
  async isSignedIn(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const account = await this.provider.getAccount();
      return account !== null;
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      return false;
    }
  }

  /**
   * Sign in with Base Account
   */
  async signIn(): Promise<BaseAccountUser> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const account = await this.provider.getAccount();
      
      if (!account) {
        throw new Error('No account found');
      }

      const user: BaseAccountUser = {
        address: account.address,
        email: account.email,
        name: account.name
      };

      console.log('✅ Signed in with Base Account:', user);
      return user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Get current Base Account
   */
  async getBaseAccount(): Promise<BaseAccountUser> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const account = await this.provider.getAccount();
      
      if (!account) {
        throw new Error('No account found');
      }

      return {
        address: account.address,
        email: account.email,
        name: account.name
      };
    } catch (error) {
      console.error('Error getting Base Account:', error);
      throw error;
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
      await this.provider.signOut();
      console.log('✅ Signed out from Base Account');
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
      
      const result = await this.provider.pay({
        to: recipient,
        amount: amount,
        currency: 'USDC',
        memo: memo || 'Debate participation fee'
      });

      console.log('✅ USDC payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.transactionHash
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
      
      const result = await this.provider.pay({
        to: contractAddress,
        amount: entryFee,
        currency: 'USDC',
        memo: `Join debate ${debateId}`
      });

      console.log('✅ Debate payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.transactionHash
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
   */
  async getUSDCBalance(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const balance = await this.provider.getBalance('USDC');
      return balance || '0';
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return '0';
    }
  }

  /**
   * Check if user has sufficient USDC balance
   */
  async hasSufficientBalance(requiredAmount: string): Promise<boolean> {
    try {
      const balance = await this.getUSDCBalance();
      return parseFloat(balance) >= parseFloat(requiredAmount);
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }
}

// Export singleton instance
export const baseAccountService = new BaseAccountService();

// Export factory function for testing
export function createBaseAccountService(): BaseAccountService {
  return new BaseAccountService();
}