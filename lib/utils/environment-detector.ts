/**
 * Environment detection utility for distinguishing between different app environments
 */
export class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private sdk: any = null;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  private async initialize() {
    // Only initialize on client-side
    if (typeof window === 'undefined') {
      console.log('⚠️ Skipping environment detector initialization on server-side');
      return;
    }

    try {
      // Try to initialize Farcaster SDK
      this.sdk = await import('@farcaster/miniapp-sdk').then(m => m.sdk);
      this.isInitialized = true;
      console.log('✅ Environment detector initialized');
    } catch (error) {
      console.log('⚠️ Farcaster SDK not available, using fallback detection');
      this.isInitialized = false;
    }
  }

  /**
   * Detect the current environment
   * @returns 'farcaster' | 'base' | 'external'
   */
  async detectEnvironment(): Promise<'farcaster' | 'base' | 'external'> {
    try {
      // First check if we're in Farcaster Mini App
      if (this.isInitialized && this.sdk) {
        const isInFarcaster = await this.sdk.isInMiniApp();
        if (isInFarcaster) {
          console.log('🔍 Environment detected: Farcaster Mini App');
          return 'farcaster';
        }
      }

      // Check if we're in Base App browser
      if (this.isBaseAppBrowser()) {
        console.log('🔍 Environment detected: Base App Browser');
        return 'base';
      }

      // Default to external browser
      console.log('🔍 Environment detected: External Browser');
      return 'external';

    } catch (error) {
      console.error('❌ Error detecting environment:', error);
      return 'external';
    }
  }

  /**
   * Check if we're in Base App browser
   */
  private isBaseAppBrowser(): boolean {
    if (typeof window === 'undefined') return false;

    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for Base App user agent patterns
    const baseAppPatterns = [
      'baseapp',
      'base-app',
      'base mobile',
      'baseapp/',
      'base/'
    ];

    const hasBaseAppPattern = baseAppPatterns.some(pattern => 
      userAgent.includes(pattern)
    );

    // Check for Base-specific window properties
    const hasBaseProperties = !!(window as any).ethereum && 
      (window as any).ethereum.isBase;

    return hasBaseAppPattern || hasBaseProperties;
  }

  /**
   * Check if we're in Farcaster Mini App (synchronous)
   */
  isFarcasterMiniApp(): boolean {
    if (typeof window === 'undefined') return false;

    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for Farcaster Mini App user agent patterns
    const farcasterPatterns = [
      'farcaster',
      'warpcast',
      'farcaster-miniapp',
      'farcaster/',
      'warpcast/'
    ];

    return farcasterPatterns.some(pattern => 
      userAgent.includes(pattern)
    );
  }

  /**
   * Check if we're in Base App browser (synchronous)
   */
  isBaseApp(): boolean {
    return this.isBaseAppBrowser();
  }

  /**
   * Get the appropriate wallet connector priority for the current environment
   */
  async getConnectorPriority(): Promise<string[]> {
    const environment = await this.detectEnvironment();
    
    switch (environment) {
      case 'farcaster':
        return ['farcasterMiniApp', 'injected', 'walletConnect', 'metaMask'];
      case 'base':
        return ['baseAccount', 'injected', 'walletConnect', 'metaMask'];
      case 'external':
      default:
        return ['baseAccount', 'metaMask', 'injected', 'walletConnect'];
    }
  }

  /**
   * Get the appropriate authentication service for the current environment
   */
  async getAuthService(): Promise<'farcaster' | 'base'> {
    const environment = await this.detectEnvironment();
    
    switch (environment) {
      case 'farcaster':
        return 'farcaster';
      case 'base':
      case 'external':
      default:
        return 'base';
    }
  }

  /**
   * Get the appropriate payment service for the current environment
   */
  async getPaymentService(): Promise<'farcaster' | 'base'> {
    const environment = await this.detectEnvironment();
    
    switch (environment) {
      case 'farcaster':
        return 'farcaster';
      case 'base':
      case 'external':
      default:
        return 'base';
    }
  }
}

// Export singleton instance
export const environmentDetector = EnvironmentDetector.getInstance();