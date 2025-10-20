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

export class FarcasterAuthService {
  private user: FarcasterUser | null = null;
  private quickAuthClient = createClient();

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
   * Sign in with Farcaster using Quick Auth
   */
  async signInWithFarcaster(): Promise<FarcasterAuthResult> {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      console.log('🔐 Starting Farcaster Quick Auth...');
      
      // Get a Quick Auth token
      const { token } = await sdk.quickAuth.getToken();
      console.log('📝 Received Quick Auth token:', token ? 'present' : 'missing');
      
      if (!token) {
        throw new Error('Failed to get Quick Auth token');
      }

      // Verify the token on the server and get user info
      const verificationResult = await this.verifyToken(token);
      
      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Token verification failed');
      }

      // Create user session
      this.user = verificationResult.user!;
      
      console.log('✅ Farcaster Quick Auth successful');
      
      return {
        success: true,
        user: this.user
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Farcaster Quick Auth failed:', err);
      
      return {
        success: false,
        error: err.message || 'Farcaster authentication failed'
      };
    }
  }

  /**
   * Verify the Quick Auth token on the server
   */
  private async verifyToken(token: string): Promise<FarcasterAuthResult> {
    try {
      console.log('🔍 Verifying Quick Auth token...');
      
      // Send to backend for verification
      const response = await fetch('/api/auth/verify-farcaster-quick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token verification failed');
      }

      const verificationData = await response.json();
      console.log('✅ Quick Auth token verified:', verificationData);

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
      console.error('❌ Quick Auth token verification failed:', err);
      
      return {
        success: false,
        error: err.message || 'Token verification failed'
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
