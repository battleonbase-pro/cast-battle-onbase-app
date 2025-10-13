// Coinbase Wallet and Base app detection utilities

/**
 * Detect if the app is running inside Coinbase Wallet or Base app in-app browser
 */
export function isCoinbaseWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for Coinbase Wallet or Base app user agents
  return (
    userAgent.includes('coinbase') ||
    userAgent.includes('base') ||
    userAgent.includes('cbwallet') ||
    // Check for specific Coinbase Wallet browser indicators
    (window as any).ethereum?.isCoinbaseWallet === true ||
    (window as any).ethereum?.isBase === true
  );
}

/**
 * Detect if the app is running inside any wallet's in-app browser
 */
export function isWalletInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  return (
    userAgent.includes('coinbase') ||
    userAgent.includes('base') ||
    userAgent.includes('metamask') ||
    userAgent.includes('trust') ||
    userAgent.includes('rainbow') ||
    userAgent.includes('phantom') ||
    userAgent.includes('cbwallet')
  );
}

/**
 * Get the appropriate Coinbase Wallet deep link for the current environment
 */
export function getCoinbaseWalletDeepLink(currentUrl: string): string {
  const encodedUrl = encodeURIComponent(currentUrl);
  
  // If we're already in Coinbase Wallet browser, we don't need a deep link
  if (isCoinbaseWalletBrowser()) {
    return currentUrl;
  }
  
  // Use the official Coinbase Wallet universal link
  return `https://go.cb-w.com/dapp?cb_url=${encodedUrl}`;
}

/**
 * Handle Coinbase Wallet connection based on the current environment
 */
export function handleCoinbaseWalletConnection(
  connect: (params: { connector: any }) => Promise<void>,
  connectors: any[],
  currentUrl: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // If we're in Coinbase Wallet browser, use the native connector
      if (isCoinbaseWalletBrowser()) {
        console.log('Detected Coinbase Wallet browser - using native connector');
        const coinbaseConnector = connectors.find(connector => 
          connector.name.toLowerCase().includes('coinbase') || 
          connector.name.toLowerCase().includes('base wallet')
        );
        
        if (coinbaseConnector) {
          await connect({ connector: coinbaseConnector });
          resolve();
          return;
        }
      }
      
      // For external browsers, use deep linking
      console.log('External browser detected - using deep link');
      const deepLink = getCoinbaseWalletDeepLink(currentUrl);
      
      // Try to open the deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      // Remove iframe after a short delay
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
      
      // For deep linking, we can't directly resolve the connection
      // The user will need to complete the connection in the Coinbase Wallet app
      resolve();
      
    } catch (error) {
      console.error('Error handling Coinbase Wallet connection:', error);
      reject(error);
    }
  });
}
