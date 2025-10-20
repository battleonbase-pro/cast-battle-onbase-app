/**
 * Environment Detection Utilities
 * Properly detects Base Mini App vs Farcaster Mini App vs External Browser
 */

export interface EnvironmentInfo {
  isFarcasterMiniApp: boolean;
  isBaseMiniApp: boolean;
  isExternalBrowser: boolean;
  environment: 'farcaster' | 'base' | 'external';
  userAgent: string;
  detectedFeatures: string[];
}

export class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private environmentInfo: EnvironmentInfo | null = null;

  static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  /**
   * Detect the current environment with comprehensive checks
   */
  async detectEnvironment(): Promise<EnvironmentInfo> {
    if (this.environmentInfo) {
      return this.environmentInfo;
    }

    const userAgent = typeof window !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const detectedFeatures: string[] = [];

    // Check for Farcaster Mini App environment
    let isFarcasterMiniApp = false;
    try {
      if (typeof window !== 'undefined') {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        isFarcasterMiniApp = await sdk.isInMiniApp();
        if (isFarcasterMiniApp) {
          detectedFeatures.push('farcaster-sdk');
        }
      }
    } catch (error) {
      console.log('Farcaster SDK not available:', error);
    }

    // Additional Farcaster detection methods
    if (!isFarcasterMiniApp && typeof window !== 'undefined') {
      // Check for Farcaster-specific globals
      if (typeof (window as any).farcaster !== 'undefined') {
        isFarcasterMiniApp = true;
        detectedFeatures.push('farcaster-global');
      }
      
      // Check user agent for Farcaster indicators
      if (userAgent.includes('farcaster') || userAgent.includes('warpcast')) {
        isFarcasterMiniApp = true;
        detectedFeatures.push('farcaster-useragent');
      }
    }

    // Check for Base Mini App environment (only if not Farcaster)
    let isBaseMiniApp = false;
    if (!isFarcasterMiniApp && typeof window !== 'undefined') {
      // Check for Base-specific globals
      if (typeof (window as any).base !== 'undefined' || 
          typeof (window as any).baseApp !== 'undefined') {
        isBaseMiniApp = true;
        detectedFeatures.push('base-global');
      }
      
      // Check for Base Account provider
      if (typeof (window as any).ethereum?.isBase === true ||
          typeof (window as any).ethereum?.isCoinbaseWallet === true) {
        isBaseMiniApp = true;
        detectedFeatures.push('base-ethereum-provider');
      }
      
      // Check user agent for Base indicators
      if (userAgent.includes('base') || 
          userAgent.includes('coinbase') || 
          userAgent.includes('cbwallet')) {
        isBaseMiniApp = true;
        detectedFeatures.push('base-useragent');
      }
    }

    // Determine environment
    let environment: 'farcaster' | 'base' | 'external';
    if (isFarcasterMiniApp) {
      environment = 'farcaster';
    } else if (isBaseMiniApp) {
      environment = 'base';
    } else {
      environment = 'external';
    }

    this.environmentInfo = {
      isFarcasterMiniApp,
      isBaseMiniApp,
      isExternalBrowser: !isFarcasterMiniApp && !isBaseMiniApp,
      environment,
      userAgent,
      detectedFeatures
    };

    console.log('🔍 Environment Detection Results:', this.environmentInfo);
    return this.environmentInfo;
  }

  /**
   * Get cached environment info
   */
  getEnvironmentInfo(): EnvironmentInfo | null {
    return this.environmentInfo;
  }

  /**
   * Reset detection (useful for testing)
   */
  reset(): void {
    this.environmentInfo = null;
  }
}

// Export singleton instance
export const environmentDetector = EnvironmentDetector.getInstance();
