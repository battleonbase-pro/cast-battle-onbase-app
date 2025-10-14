// Mini-app environment detection utilities

/**
 * Detect if the app is running inside a mini-app environment
 */
export function isMiniAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for Farcaster mini-app indicators
  const isFarcaster = (
    userAgent.includes('farcaster') ||
    userAgent.includes('warpcast') ||
    // Check for Farcaster SDK presence
    typeof (window as any).farcaster !== 'undefined' ||
    // Check for Farcaster-specific globals
    typeof (window as any).fc !== 'undefined'
  );
  
  // Check for Base mini-app indicators
  const isBase = (
    userAgent.includes('base') ||
    userAgent.includes('coinbase') ||
    userAgent.includes('cbwallet') ||
    // Check for Base-specific globals
    typeof (window as any).base !== 'undefined' ||
    typeof (window as any).baseApp !== 'undefined' ||
    // Check for Base Account connector
    typeof (window as any).ethereum?.isBase === true ||
    // Check for Coinbase Wallet
    typeof (window as any).ethereum?.isCoinbaseWallet === true
  );
  
  return isFarcaster || isBase;
}

/**
 * Detect if the app is running inside Farcaster specifically
 */
export function isFarcasterEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  return (
    userAgent.includes('farcaster') ||
    userAgent.includes('warpcast') ||
    typeof (window as any).farcaster !== 'undefined' ||
    typeof (window as any).fc !== 'undefined'
  );
}

/**
 * Detect if the app is running inside Base mini-app specifically
 */
export function isBaseEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  return (
    userAgent.includes('base') ||
    userAgent.includes('coinbase') ||
    userAgent.includes('cbwallet') ||
    typeof (window as any).base !== 'undefined' ||
    typeof (window as any).baseApp !== 'undefined' ||
    typeof (window as any).ethereum?.isBase === true ||
    typeof (window as any).ethereum?.isCoinbaseWallet === true
  );
}

/**
 * Detect if the app is running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if we should use polling instead of WebSocket
 * Returns true for mobile mini-app environments
 */
export function shouldUsePolling(): boolean {
  return isMiniAppEnvironment() && isMobileDevice();
}

/**
 * Get polling interval based on environment
 */
export function getPollingInterval(): number {
  if (shouldUsePolling()) {
    return 30000; // 30 seconds for mobile mini-apps
  }
  return 5000; // 5 seconds for desktop (fallback)
}

/**
 * Get environment type for debugging
 */
export function getEnvironmentInfo(): {
  isMiniApp: boolean;
  isFarcaster: boolean;
  isBase: boolean;
  isMobile: boolean;
  shouldUsePolling: boolean;
  userAgent: string;
} {
  return {
    isMiniApp: isMiniAppEnvironment(),
    isFarcaster: isFarcasterEnvironment(),
    isBase: isBaseEnvironment(),
    isMobile: isMobileDevice(),
    shouldUsePolling: shouldUsePolling(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
  };
}
