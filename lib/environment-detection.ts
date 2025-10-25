/**
 * Shared environment detection utilities
 * Used by both wagmi-config and useEnvironmentDetection hook
 */

export interface DetectionResult {
  isMiniApp: boolean;
  isBaseApp: boolean;
  isFarcaster: boolean;
  isExternal: boolean;
  environment: 'farcaster' | 'base' | 'external';
  confidence: 'high' | 'medium' | 'low';
  method: string;
}

/**
 * Fast URL-based detection (used by wagmi-config)
 * This runs synchronously and doesn't depend on MiniKit context
 */
export function detectEnvironmentFromURL(): DetectionResult {
  if (typeof window === 'undefined') {
    return {
      isMiniApp: false,
      isBaseApp: false,
      isFarcaster: false,
      isExternal: true,
      environment: 'external',
      confidence: 'low',
      method: 'ssr-fallback'
    };
  }

  // Base App detection patterns
  const isBaseAppUrl = window.location.href.includes('base.app') || 
                     window.location.href.includes('miniapp') ||
                     window.location.hostname.includes('base') ||
                     window.location.search.includes('base') ||
                     document.referrer.includes('base.app');

  // Farcaster detection patterns  
  const isFarcasterUrl = window.location.href.includes('farcaster.xyz') ||
                        window.location.href.includes('warpcast.com') ||
                        window.location.hostname.includes('farcaster') ||
                        document.referrer.includes('farcaster');

  // Additional Base App feature detection
  const hasBaseFeatures = window.ethereum?.isBase || 
                         window.ethereum?.isCoinbaseWallet ||
                         navigator.userAgent.includes('Base') ||
                         (window.location.protocol === 'https:' && window.location.hostname.includes('base'));

  // Mini App iframe detection
  const isInIframe = window.parent !== window || window.self !== window.top;

  // Mini App property detection
  const hasMiniAppProperties = !!(window as any).farcaster || !!(window as any).miniapp;

  if (isBaseAppUrl || hasBaseFeatures) {
    return {
      isMiniApp: true,
      isBaseApp: true,
      isFarcaster: false,
      isExternal: false,
      environment: 'base',
      confidence: 'high',
      method: 'url-and-features'
    };
  }

  if (isFarcasterUrl) {
    return {
      isMiniApp: true,
      isBaseApp: false,
      isFarcaster: true,
      isExternal: false,
      environment: 'farcaster',
      confidence: 'high',
      method: 'url-patterns'
    };
  }

  if (isInIframe || hasMiniAppProperties) {
    return {
      isMiniApp: true,
      isBaseApp: false,
      isFarcaster: false,
      isExternal: false,
      environment: 'external', // Default to external for unknown Mini Apps
      confidence: 'medium',
      method: 'iframe-or-properties'
    };
  }

  return {
    isMiniApp: false,
    isBaseApp: false,
    isFarcaster: false,
    isExternal: true,
    environment: 'external',
    confidence: 'high',
    method: 'external-browser'
  };
}

/**
 * Precise MiniKit-based detection (used by useEnvironmentDetection hook)
 * This provides the most accurate detection when MiniKit context is available
 */
export function detectEnvironmentFromMiniKit(context: any): DetectionResult {
  if (!context || !context.client) {
    return detectEnvironmentFromURL(); // Fallback to URL detection
  }

  // Make ClientFIDs configurable via environment variables
  const BASE_APP_CLIENT_FID = parseInt(process.env.NEXT_PUBLIC_BASE_APP_CLIENT_FID || '309857');
  const FARCASTER_CLIENT_FID = parseInt(process.env.NEXT_PUBLIC_FARCASTER_CLIENT_FID || '9152');
  
  const isBaseApp = context.client?.clientFid === BASE_APP_CLIENT_FID;
  const isFarcaster = context.client?.clientFid === FARCASTER_CLIENT_FID;
  const isMiniApp = isBaseApp || isFarcaster;

  if (isBaseApp) {
    return {
      isMiniApp: true,
      isBaseApp: true,
      isFarcaster: false,
      isExternal: false,
      environment: 'base',
      confidence: 'high',
      method: 'minikit-context'
    };
  }

  if (isFarcaster) {
    return {
      isMiniApp: true,
      isBaseApp: false,
      isFarcaster: true,
      isExternal: false,
      environment: 'farcaster',
      confidence: 'high',
      method: 'minikit-context'
    };
  }

  // Fallback to URL detection if MiniKit context doesn't match known patterns
  return detectEnvironmentFromURL();
}
