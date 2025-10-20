import { verifySignInMessage } from '@farcaster/auth-client';

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

export class FarcasterAuthService {
  private user: FarcasterUser | null = null;

  /**
   * Check if we're in a Farcaster Mini App environment
   */
  async isInMiniApp(): Promise<boolean> {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      return await sdk.isInMiniApp(100);
    } catch (error) {
      console.log('Not in Farcaster Mini App:', error);
      return false;
    }
  }

  /**
   * Sign in with Farcaster using the Mini App SDK
   */
  async signInWithFarcaster(): Promise<FarcasterAuthResult> {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      console.log('🔐 Starting Farcaster authentication...');
      
      // Call sdk.actions.signIn() to prompt user to sign in with Farcaster
      const result = await sdk.actions.signIn();
      
      console.log('📝 Received Farcaster sign-in result:', result);
      
      // The result should contain message and signature
      if (!result.message || !result.signature) {
        throw new Error('Invalid sign-in result: missing message or signature');
      }

      // Verify the signature on the server
      const verificationResult = await this.verifySignature(result.message, result.signature);
      
      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Signature verification failed');
      }

      // Create user session
      this.user = verificationResult.user!;
      
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
        error: err.message || 'Farcaster authentication failed'
      };
    }
  }

  /**
   * Verify the Farcaster signature on the server
   */
  private async verifySignature(message: string, signature: string): Promise<FarcasterAuthResult> {
    try {
      console.log('🔍 Verifying Farcaster signature...');
      
      // Send to backend for verification
      const response = await fetch('/api/auth/verify-farcaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signature verification failed');
      }

      const verificationData = await response.json();
      console.log('✅ Farcaster signature verified:', verificationData);

      // Create user object from verification data
      const user: FarcasterUser = {
        fid: verificationData.fid,
        username: verificationData.username,
        displayName: verificationData.displayName,
        pfpUrl: verificationData.pfpUrl,
        address: verificationData.address,
        isAuthenticated: true
      };

      return {
        success: true,
        user
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Farcaster signature verification failed:', err);
      
      return {
        success: false,
        error: err.message || 'Signature verification failed'
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user?.isAuthenticated || false;
  }

  /**
   * Get current user
   */
  getCurrentUser(): FarcasterUser | null {
    return this.user;
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.user = null;
    console.log('👋 Farcaster user signed out');
  }
}

// Export singleton instance
export const farcasterAuthService = new FarcasterAuthService();

// Export factory function for testing
export function createFarcasterAuthService(): FarcasterAuthService {
  return new FarcasterAuthService();
}
