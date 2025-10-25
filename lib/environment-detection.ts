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
 * Simple fallback detection for SSR and when MiniKit context is unavailable
 * This is only used as a last resort fallback
 */
export function detectEnvironmentFallback(): DetectionResult {
  return {
    isMiniApp: false,
    isBaseApp: false,
    isFarcaster: false,
    isExternal: true,
    environment: 'external',
    confidence: 'low',
    method: 'fallback'
  };
}

/**
 * Precise MiniKit-based detection (used by useEnvironmentDetection hook)
 * This provides the most accurate detection when MiniKit context is available
 */
export function detectEnvironmentFromMiniKit(context: any): DetectionResult {
  if (!context || !context.client) {
    return detectEnvironmentFallback(); // Fallback to simple fallback
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
