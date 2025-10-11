// Alternative mobile wallet callback methods (without WalletConnect)

export interface WalletCallbackSession {
  id: string;
  wallet: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  returnUrl?: string;
}

export interface UniversalLinkConfig {
  scheme: string;
  host: string;
  path: string;
}

// Generate a unique session ID for wallet connection
export function generateWalletSessionId(): string {
  return `wallet_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a wallet callback session
export function createWalletCallbackSession(wallet: string): WalletCallbackSession {
  const session: WalletCallbackSession = {
    id: generateWalletSessionId(),
    wallet,
    timestamp: Date.now(),
    status: 'pending',
    returnUrl: window.location.href,
  };
  
  // Store session in localStorage
  localStorage.setItem(`wallet_session_${session.id}`, JSON.stringify(session));
  
  return session;
}

// Check for completed wallet sessions
export function checkWalletCallbackSessions(): WalletCallbackSession[] {
  const completedSessions: WalletCallbackSession[] = [];
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.startsWith('wallet_session_')) {
      try {
        const session = JSON.parse(localStorage.getItem(key) || '{}') as WalletCallbackSession;
        
        // Check if session is completed or expired (5 minutes)
        const isExpired = Date.now() - session.timestamp > 5 * 60 * 1000;
        
        if (session.status === 'completed' || isExpired) {
          completedSessions.push(session);
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('Error parsing wallet session:', error);
        localStorage.removeItem(key);
      }
    }
  });
  
  return completedSessions;
}

// Generate universal link for wallet app with proper connection flow
export function generateUniversalLink(wallet: string, sessionId: string): string {
  const baseUrl = window.location.origin;
  const callbackUrl = `${baseUrl}/api/wallet/callback?session=${sessionId}&wallet=${wallet}`;
  
  // Use proper connection deep links that trigger sign-in flow
  const connectionLinks: Record<string, string> = {
    metamask: `metamask://dapp/${encodeURIComponent(baseUrl)}`,
    trust: `trust://open_url?url=${encodeURIComponent(baseUrl)}`,
    coinbase: `cbwallet://dapp/${encodeURIComponent(baseUrl)}`,
    rainbow: `rainbow://dapp/${encodeURIComponent(baseUrl)}`,
    phantom: `phantom://dapp/${encodeURIComponent(baseUrl)}`,
  };
  
  const deepLink = connectionLinks[wallet.toLowerCase()];
  if (!deepLink) {
    throw new Error(`Unsupported wallet: ${wallet}`);
  }
  
  return deepLink;
}

// Alternative: Use custom URL scheme with app-specific callback
export function generateCustomSchemeCallback(wallet: string, sessionId: string): string {
  const baseUrl = window.location.origin;
  const callbackUrl = `${baseUrl}/api/wallet/callback?session=${sessionId}&wallet=${wallet}`;
  
  const customSchemes: Record<string, string> = {
    metamask: `metamask://dapp/browse?url=${encodeURIComponent(callbackUrl)}`,
    trust: `trust://open_url?url=${encodeURIComponent(callbackUrl)}`,
    coinbase: `cbwallet://dapp/browse?url=${encodeURIComponent(callbackUrl)}`,
    rainbow: `rainbow://dapp/browse?url=${encodeURIComponent(callbackUrl)}`,
    phantom: `phantom://dapp/browse?url=${encodeURIComponent(callbackUrl)}`,
  };
  
  return customSchemes[wallet.toLowerCase()] || '';
}

// Start polling for wallet connection status
export function startWalletConnectionPolling(
  sessionId: string, 
  onSuccess: (session: WalletCallbackSession) => void,
  onError: (error: string) => void,
  timeoutMs: number = 300000 // 5 minutes
): () => void {
  const startTime = Date.now();
  
  const pollInterval = setInterval(() => {
    // Check if timeout reached
    if (Date.now() - startTime > timeoutMs) {
      clearInterval(pollInterval);
      onError('Wallet connection timeout');
      return;
    }
    
    // Check for completed sessions
    const completedSessions = checkWalletCallbackSessions();
    const ourSession = completedSessions.find(s => s.id === sessionId);
    
    if (ourSession) {
      clearInterval(pollInterval);
      
      if (ourSession.status === 'completed') {
        onSuccess(ourSession);
      } else {
        onError('Wallet connection failed');
      }
    }
  }, 2000); // Poll every 2 seconds
  
  // Return cleanup function
  return () => clearInterval(pollInterval);
}

// Handle wallet app return via URL parameters
export function handleWalletReturn(): WalletCallbackSession | null {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  const wallet = urlParams.get('wallet');
  const status = urlParams.get('status');
  const address = urlParams.get('address');
  
  if (sessionId && wallet) {
    const session: WalletCallbackSession = {
      id: sessionId,
      wallet,
      timestamp: Date.now(),
      status: status === 'success' ? 'completed' : 'failed',
      returnUrl: window.location.href,
    };
    
    // Store completed session
    localStorage.setItem(`wallet_session_${sessionId}`, JSON.stringify(session));
    
    // Clean up URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('session');
    newUrl.searchParams.delete('wallet');
    newUrl.searchParams.delete('status');
    newUrl.searchParams.delete('address');
    window.history.replaceState({}, '', newUrl.toString());
    
    return session;
  }
  
  return null;
}

// Alternative: Use postMessage for wallet communication
export function setupWalletPostMessageListener(
  onWalletMessage: (data: any) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    // Verify origin for security
    if (event.origin !== window.location.origin) {
      return;
    }
    
    if (event.data.type === 'WALLET_CONNECTION') {
      onWalletMessage(event.data);
    }
  };
  
  window.addEventListener('message', handleMessage);
  
  // Return cleanup function
  return () => window.removeEventListener('message', handleMessage);
}

// Send message to wallet app via postMessage
export function sendWalletMessage(data: any): void {
  // This would be called from within the wallet app's webview
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'WALLET_CONNECTION',
      ...data
    }, window.location.origin);
  }
}
