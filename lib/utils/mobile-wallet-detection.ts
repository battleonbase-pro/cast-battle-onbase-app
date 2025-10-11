// Mobile wallet detection and deep linking utilities

export interface MobileWallet {
  name: string;
  displayName: string;
  icon: string;
  deepLink: string;
  appStoreUrl: string;
  playStoreUrl: string;
  isInstalled?: boolean;
}

export interface WalletDeepLink {
  scheme: string;
  url: string;
  fallbackUrl: string;
}

// Detect if user is on mobile device
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Detect if user is on iOS
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Detect if user is on Android
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
}

// Mobile wallet configurations with WalletConnect support
export const MOBILE_WALLETS: MobileWallet[] = [
  {
    name: 'walletconnect',
    displayName: 'WalletConnect',
    icon: '/wallet-icons/walletconnect.svg',
    deepLink: 'walletconnect://wc?uri=',
    appStoreUrl: 'https://apps.apple.com/app/walletconnect/id1359134690',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.walletconnect',
  },
  {
    name: 'coinbase',
    displayName: 'Coinbase Wallet',
    icon: '/wallet-icons/coinbase.svg',
    deepLink: 'cbwallet://wc?uri=',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
  },
  {
    name: 'phantom',
    displayName: 'Phantom',
    icon: '/wallet-icons/phantom.svg',
    deepLink: 'phantom://wc?uri=',
    appStoreUrl: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
  },
];

// Generate deep link for wallet
export function generateWalletDeepLink(wallet: MobileWallet, currentUrl: string): WalletDeepLink {
  const encodedUrl = encodeURIComponent(currentUrl);
  
  return {
    scheme: wallet.deepLink.split('://')[0],
    url: `${wallet.deepLink}${encodedUrl}`,
    fallbackUrl: isIOS() ? wallet.appStoreUrl : wallet.playStoreUrl,
  };
}

// Attempt to open wallet app with deep link
export function openWalletApp(wallet: MobileWallet, currentUrl: string): void {
  const deepLink = generateWalletDeepLink(wallet, currentUrl);
  
  // Create a hidden iframe to attempt the deep link
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = deepLink.url;
  document.body.appendChild(iframe);
  
  // Remove iframe after a short delay
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
  
  // Fallback: if the app doesn't open, redirect to app store after a delay
  setTimeout(() => {
    if (confirm(`${wallet.displayName} app not found. Would you like to install it?`)) {
      window.open(deepLink.fallbackUrl, '_blank');
    }
  }, 2000);
}

// Check if a wallet app might be installed (basic heuristic)
export function checkWalletInstallation(wallet: MobileWallet): boolean {
  // This is a basic check - in reality, we can't reliably detect installed apps
  // We'll use a timeout-based approach in the openWalletApp function
  return false;
}

// Get appropriate wallets for current platform
export function getAvailableMobileWallets(): MobileWallet[] {
  return MOBILE_WALLETS.map(wallet => ({
    ...wallet,
    isInstalled: checkWalletInstallation(wallet),
  }));
}
