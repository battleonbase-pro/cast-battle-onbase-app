import { createClient } from '@farcaster/quick-auth';

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  address: string;
  isAuthenticated: boolean;
}

export interface FarcasterAuthResult {
  success: boolean;
  user?: FarcasterUser;
  error?: string;
}

export interface FarcasterPaymentOptions {
  amount: string;
  recipientAddress: string;
  onTransactionHash?: (hash: string) => void;
  onError?: (error: Error) => void;
}

export interface FarcasterPaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class FarcasterAuthService {
  private sdk: any = null;
  private isInitialized = false;
  private user: FarcasterUser | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Only initialize on client-side
    if (typeof window === 'undefined') {
      console.log('⚠️ Skipping Farcaster SDK initialization on server-side');
      return;
    }

    try {
      // Initialize Farcaster SDK
      this.sdk = await import('@farcaster/miniapp-sdk').then(m => m.sdk);
      console.log('✅ Farcaster SDK initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Farcaster SDK:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Farcaster SDK is available
   */
  isAvailable(): boolean {
    return this.isInitialized && !!this.sdk;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.user?.isAuthenticated;
  }

  /**
   * Get current user
   */
  getUser(): FarcasterUser | null {
    return this.user;
  }

  /**
   * Sign in with Farcaster using the official Sign in with Farcaster (SIWF) approach
   * Based on FIP-11 specification: https://github.com/farcasterxyz/protocol/discussions/110
   */
  async signInWithFarcaster(): Promise<FarcasterAuthResult> {
    // Only work on client-side
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'Authentication only available on client-side'
      };
    }

    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Farcaster SDK not available'
      };
    }

    try {
      console.log('🔐 Starting Sign in with Farcaster (SIWF)...');
      
      // Check if we're in Farcaster Mini App
      const isInMiniApp = await this.sdk.isInMiniApp();
      if (!isInMiniApp) {
        return {
          success: false,
          error: 'Not in Farcaster Mini App environment'
        };
      }

      // Use Farcaster's native sign-in flow
      const signInResult = await this.sdk.actions.signIn();
      
      if (!signInResult.success) {
        throw new Error(signInResult.error || 'Farcaster sign-in failed');
      }

      console.log('✅ Farcaster sign-in successful:', signInResult);

      // Extract user information from sign-in result
      const userData = signInResult.user;
      
      this.user = {
        fid: userData.fid,
        username: userData.username,
        displayName: userData.displayName,
        pfpUrl: userData.pfpUrl,
        address: userData.address,
        isAuthenticated: true
      };

      console.log('✅ Farcaster authentication successful');
      
      return {
        success: true,
        user: this.user
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Farcaster authentication failed:', err);
      
      return {
        success: false,
        error: err.message || 'Authentication failed'
      };
    }
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.user = null;
    console.log('👋 Farcaster user signed out');
  }

  /**
   * Send USDC payment using Farcaster's native wallet
   */
  async sendUSDCPayment(options: FarcasterPaymentOptions): Promise<FarcasterPaymentResult> {
    try {
      console.log('🔗 Starting Farcaster native USDC payment...');
      
      // Check if we're in Farcaster environment
      const isInFarcaster = await this.sdk.isInMiniApp();
      if (!isInFarcaster) {
        throw new Error('Not in Farcaster Mini App environment');
      }

      // Get Ethereum provider from Farcaster SDK
      const provider = await this.sdk.wallet.getEthereumProvider();
      
      if (!provider) {
        throw new Error('Farcaster Ethereum provider not available');
      }

      // USDC contract address on Base Sepolia
      const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      // Parse amount (USDC has 6 decimals)
      const { parseUnits } = await import('viem');
      const amountWei = parseUnits(options.amount, 6);
      
      // Create transaction data for USDC transfer
      const transactionData = {
        to: usdcAddress,
        data: `0xa9059cbb${options.recipientAddress.slice(2).padStart(64, '0')}${amountWei.toString(16).padStart(64, '0')}`,
        value: '0x0' // No ETH value for token transfer
      };

      console.log('📝 Farcaster payment transaction data:', transactionData);

      // Send transaction using Farcaster's native provider
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });

      console.log('✅ Farcaster payment transaction submitted:', hash);
      
      // Wait for transaction confirmation
      console.log('⏳ Waiting for transaction confirmation...');
      
      // Poll for transaction receipt
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
        
        try {
          const receipt = await provider.request({
            method: 'eth_getTransactionReceipt',
            params: [hash]
          });
          
          if (receipt && receipt.status === '0x1') {
            console.log('✅ Farcaster payment transaction confirmed');
            confirmed = true;
          } else if (receipt && receipt.status === '0x0') {
            throw new Error('Transaction failed');
          }
        } catch (receiptError) {
          console.log(`🔍 Transaction confirmation check ${attempts}/${maxAttempts}...`);
          if (attempts >= maxAttempts) {
            throw new Error('Transaction confirmation timeout');
          }
        }
      }
      
      if (!confirmed) {
        throw new Error('Transaction confirmation timeout');
      }
      
      // Call success callback
      if (options.onTransactionHash) {
        options.onTransactionHash(hash);
      }

      return {
        success: true,
        transactionHash: hash
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Farcaster payment failed:', err);
      
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
   * Get user's points
   */
  async getUserPoints(): Promise<{ points: number; error?: string }> {
    if (!this.isAuthenticated()) {
      return {
        points: 0,
        error: 'User not authenticated'
      };
    }

    try {
      const response = await fetch(`/api/user/points?address=${this.user!.address}`);
      const data = await response.json();
      
      if (data.success) {
        return { points: data.points };
      } else {
        throw new Error(data.error || 'Failed to fetch points');
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Failed to fetch user points:', err);
      return {
        points: 0,
        error: err.message
      };
    }
  }
}

// Export singleton instance
export const farcasterAuthService = new FarcasterAuthService();

// Export factory function for testing
export function createFarcasterAuthService(): FarcasterAuthService {
  return new FarcasterAuthService();
}