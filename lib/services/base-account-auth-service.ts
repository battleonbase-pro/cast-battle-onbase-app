import { createBaseAccountSDK } from '@base-org/account';

export interface BaseAccountUser {
  address: string;
  isAuthenticated: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: BaseAccountUser;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class BaseAccountAuthService {
  private sdk: unknown = null;
  private provider: unknown = null;
  private isInitialized = false;
  private user: BaseAccountUser | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Only initialize on client-side
    if (typeof window === 'undefined') {
      console.log('⚠️ Skipping Base Account SDK initialization on server-side');
      return;
    }

    try {
      // Initialize Base Account SDK
      this.sdk = await createBaseAccountSDK();
      console.log('✅ Base Account SDK initialized');
      
      // Get provider from SDK
      this.provider = (this.sdk as any).provider;
      console.log('✅ Base Account provider obtained');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Base Account SDK:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Base Account is available
   */
  isAvailable(): boolean {
    return this.isInitialized && !!this.provider;
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
  getUser(): BaseAccountUser | null {
    return this.user;
  }

  /**
   * Sign in with Base Account using the simple, working approach
   */
  async signInWithBase(): Promise<AuthResult> {
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
        error: 'Base Account SDK not available'
      };
    }

    try {
      console.log('🔐 Starting Base Account authentication...');
      
      // 1. Get a fresh nonce
      const nonceResponse = await fetch('/api/auth/nonce');
      if (!nonceResponse.ok) {
        throw new Error('Failed to generate nonce');
      }
      const data = await nonceResponse.json();
      const nonce = data.nonce;
      console.log('🔑 Using nonce:', nonce);

      // Resolve chainId (Base Mainnet or Base Sepolia) per docs
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
      const chainIdHex = isTestnet ? '0x14A34' /* 84532 Base Sepolia */ : '0x2105' /* 8453 Base Mainnet */;

      // 2. Switch to Base Chain
      try {
        await (this.provider as any).request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
        console.log('✅ Switched to Base Chain');
      } catch (switchError: unknown) {
        const error = switchError as Error;
        console.log('⚠️ Chain switch failed or already on Base:', error.message);
      }

      // 3. Get accounts using eth_requestAccounts
      const accounts = await (this.provider as any).request({
        method: 'eth_requestAccounts'
      });
      
      const address = accounts[0];
      console.log('✅ Connected to address:', address);

      // 4. Create SIWE message manually
      const domain = window.location.host;
      const uri = window.location.origin;
      const currentTime = Math.floor(Date.now() / 1000);
      
      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Welcome to NewsCast Debate!

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

URI: ${uri}
Version: 1
Chain ID: ${parseInt(chainIdHex, 16)}
Nonce: ${nonce}
Issued At: ${new Date(currentTime * 1000).toISOString()}`;

      console.log('📝 Generated SIWE message:', message);

      // 5. Sign the message using personal_sign
      const signature = await (this.provider as any).request({
        method: 'personal_sign',
        params: [message, address]
      });

      console.log('✅ personal_sign successful');
      console.log('📝 Generated signature:', signature);

      // 6. Verify with backend
      console.log('🔍 Verifying signature with backend...');
      
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication verification failed');
      }

      const verificationResult = await response.json();
      console.log('✅ Backend verification successful:', verificationResult);

      // 7. Create user session
      this.user = {
        address: address,
        isAuthenticated: true
      };

      console.log('✅ Base Account authentication successful');
      
      return {
        success: true,
        user: this.user
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Base Account authentication failed:', err);
      
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
    console.log('👋 User signed out');
  }

  /**
   * Join debate with payment
   */
  async joinDebateWithPayment(debateId: number, entryFee: string): Promise<PaymentResult> {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      console.log(`💰 Joining debate ${debateId} with entry fee ${entryFee} USDC`);
      
      // Use Base Pay SDK for payment
      const basePaySDK = (this.sdk as any).pay;
      
      if (!basePaySDK) {
        throw new Error('Base Pay SDK not available');
      }

      const result = await basePaySDK.send({
        to: '0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271', // Recipient address
        value: entryFee,
        currency: 'USDC'
      });

      console.log('✅ Payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.transactionHash
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Payment failed:', err);
      return {
        success: false,
        error: err.message || 'Payment failed'
      };
    }
  }

  /**
   * Join debate with authenticated user
   */
  async joinDebate(debateId: number, castContent: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/battle/submit-cast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          castContent,
          debateId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join debate');
      }

      console.log('✅ Successfully joined debate');
      return { success: true };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Failed to join debate:', err);
      return {
        success: false,
        error: err.message
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

  /**
   * Share battle on social media
   */
  async shareBattle(battleId: string, platform: 'x' | 'linkedin'): Promise<{ success: boolean; points?: number; error?: string }> {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      const response = await fetch('/api/battle/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battleId,
          platform,
          userAddress: this.user!.address
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          points: data.points
        };
      } else {
        throw new Error(data.error || 'Failed to share battle');
      }

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Failed to share battle:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

// Export singleton instance
export const baseAccountAuthService = new BaseAccountAuthService();

// Export factory function for testing
export function createBaseAccountAuthService(): BaseAccountAuthService {
  return new BaseAccountAuthService();
}