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
    try {
      if (typeof window !== 'undefined') {
        this.sdk = createBaseAccountSDK({
          appName: 'NewsCast Debate'
        });
        this.provider = (this.sdk as any).getProvider();
        this.isInitialized = true;
        console.log('✅ Base Account Auth Service initialized');
      }
    } catch (error) {
      console.log('⚠️ Base Account Auth Service not available:', error);
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
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null && this.user.isAuthenticated;
  }

  /**
   * Get current user data
   */
  getCurrentUser(): BaseAccountUser | null {
    return this.user;
  }

  /**
   * Sign in with Base Account using SIWE (Sign in with Ethereum)
   */
  async signInWithBase(nonceOverride?: string): Promise<AuthResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Base Account SDK not available'
      };
    }

    try {
      console.log('🔐 Starting Base Account authentication...');
      
      // 1. Get a fresh nonce (use override if provided)
      let nonce = nonceOverride;
      if (!nonce) {
        const nonceResponse = await fetch('/api/auth/nonce');
        if (!nonceResponse.ok) {
          throw new Error('Failed to generate nonce');
        }
        const data = await nonceResponse.json();
        nonce = data.nonce;
      }
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

      let address: string;
      let message: string;
      let signature: string;

      // 3. Try wallet_connect first (Base Account SDK method)
      try {
        console.log('🔄 Attempting wallet_connect method...');
        const { accounts } = await (this.provider as any).request({
          method: 'wallet_connect',
          params: [{
            version: '1',
            capabilities: {
              signInWithEthereum: { 
                nonce: nonce!, 
                chainId: chainIdHex
              }
            }
          }]
        });

        address = accounts[0].address;
        message = accounts[0].capabilities.signInWithEthereum.message;
        signature = accounts[0].capabilities.signInWithEthereum.signature;
        
        console.log('✅ wallet_connect method successful');
        console.log('📝 Received SIWE data:', { address, message, signature });

      } catch (walletConnectError: unknown) {
        const error = walletConnectError as Error & { code?: string };
        console.log('⚠️ wallet_connect failed:', error.message);
        
        // Check if it's method_not_supported error
        if (error.message?.includes('method_not_supported') || 
            error.code === 'METHOD_NOT_SUPPORTED') {
          
          console.log('🔄 Falling back to eth_requestAccounts + personal_sign...');
          
          // Fallback: Use eth_requestAccounts and personal_sign
          const accounts = await (this.provider as any).request({
            method: 'eth_requestAccounts'
          });
          
          address = accounts[0];
          console.log('✅ Connected to address:', address);

          // Create SIWE message manually
          const domain = window.location.host;
          const uri = window.location.origin;
          const currentTime = Math.floor(Date.now() / 1000);
          
          message = `${domain} wants you to sign in with your Ethereum account:
${address}

${this.buildSIWEMessage(nonce!, currentTime)}

URI: ${uri}
Version: 1
Chain ID: ${isTestnet ? 84532 : 8453}
Nonce: ${nonce}
Issued At: ${new Date(currentTime * 1000).toISOString()}`;

          console.log('📝 Generated SIWE message:', message);

          // Sign the message
          signature = await (this.provider as any).request({
            method: 'personal_sign',
            params: [message, address]
          });

          console.log('✅ personal_sign successful');
          console.log('📝 Generated signature:', signature);

        } else {
          // Re-throw if it's not a method_not_supported error
          throw error;
        }
      }

      // 4. Verify with backend
      console.log('🔍 Verifying signature with backend...');
      console.log('📝 Address:', address);
      console.log('📝 Message:', message);
      console.log('📝 Signature length:', signature.length);
      console.log('📝 Signature preview (first 100):', signature.substring(0, 100) + '...');
      console.log('📝 Signature preview (last 100):', '...' + signature.substring(signature.length - 100));
      console.log('📝 Full signature:', signature);
      
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

      // 5. Create user session
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
   * Build SIWE message for fallback authentication
   */
  private buildSIWEMessage(nonce: string, issuedAt: number): string {
    return `Welcome to NewsCast Debate!

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

Wallet address:
Nonce: ${nonce}
Issued At: ${new Date(issuedAt * 1000).toISOString()}`;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    this.user = null;
    console.log('✅ Signed out from Base Account');
  }

  /**
   * Make a USDC payment using Base Account
   */
  async payUSDC(recipient: string, amount: string): Promise<PaymentResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Base Account SDK not available'
      };
    }

    try {
      console.log(`💰 Making USDC payment: ${amount} USDC to ${recipient}`);
      
      // Use the Base Account SDK for payments
      const result = await (this.sdk as any).pay({
        to: recipient as `0x${string}`,
        amount: amount,
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      console.log('✅ USDC payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.id
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ USDC payment failed:', err);
      
      return {
        success: false,
        error: err.message || 'Payment failed'
      };
    }
  }

  /**
   * Join debate with USDC payment
   */
  async joinDebateWithPayment(debateId: number, entryFee: string): Promise<PaymentResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Base Account SDK not available'
      };
    }

    try {
      // Get contract address from environment
      const contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
      if (!contractAddress) {
        return {
          success: false,
          error: 'Contract address not configured'
        };
      }

      console.log(`🎯 Joining debate ${debateId} with ${entryFee} USDC payment`);
      
      const result = await (this.sdk as any).pay({
        to: contractAddress as `0x${string}`,
        amount: entryFee,
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      console.log('✅ Debate payment successful:', result);
      
      return {
        success: true,
        transactionHash: result.id
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Debate payment failed:', err);
      
      return {
        success: false,
        error: err.message || 'Debate payment failed'
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
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/user/points`);

      if (!response.ok) {
        throw new Error('Failed to fetch user points');
      }

      const data = await response.json();
      return { points: data.points || 0 };

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
   * Share battle and earn points
   */
  async shareBattle(battleId: string, platform: 'x' | 'linkedin'): Promise<{ success: boolean; points?: number; error?: string }> {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/share/reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          battleId,
          platform
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share battle');
      }

      const data = await response.json();
      console.log('✅ Successfully shared battle and earned points');
      
      return { 
        success: true, 
        points: data.pointsEarned || 0 
      };

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
