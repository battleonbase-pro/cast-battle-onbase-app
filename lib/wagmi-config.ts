import { http, createConfig } from 'wagmi'
import { base, baseSepolia, mainnet } from 'viem/chains'
import { walletConnect, baseAccount } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { detectEnvironmentFallback } from './environment-detection'

// Create config as singleton to prevent multiple WalletConnect initializations
let wagmiConfig: ReturnType<typeof createConfig> | null = null;

export const config = (() => {
  if (!wagmiConfig) {
    // Get WalletConnect project ID, only include WalletConnect if valid ID is provided
    const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    const hasValidWalletConnectId = walletConnectProjectId && 
      walletConnectProjectId !== 'your-project-id' && 
      walletConnectProjectId !== 'your-walletconnect-project-id';

    // Get the current URL for WalletConnect metadata
    const getCurrentUrl = () => {
      if (typeof window !== 'undefined') {
        return window.location.origin;
      }
      return 'https://news-debate-onbase-app.vercel.app'; // fallback for SSR
    };

    const currentUrl = getCurrentUrl();

    // Log WalletConnect configuration status (only once)
    if (process.env.NODE_ENV === 'development') {
      console.log('WalletConnect Project ID:', walletConnectProjectId);
      console.log('Has valid WalletConnect ID:', hasValidWalletConnectId);
      console.log('Current URL for metadata:', currentUrl);
    }

    // Build connectors array - prioritize Base Account for Mini Apps
    console.log('🔗 Initializing connectors - environment detection will be handled asynchronously');
    const connectors = [
      baseAccount({
        appName: 'NewsCast Debate',
      }),
      miniAppConnector(), // Farcaster connector as fallback
    ];
    
    // Add external wallet connectors for external browsers only
    // This prevents eip6963RequestProvider errors in Mini App environments
    // Use fallback detection - MiniKit context will override this at runtime
    const detectionResult = detectEnvironmentFallback();
    
    console.log('🔗 Wagmi connector detection (fallback):', {
      environment: detectionResult.environment,
      isMiniApp: detectionResult.isMiniApp,
      confidence: detectionResult.confidence,
      method: detectionResult.method
    });
    
    // IMPORTANT: We use OnchainKit for wallet connection in external browsers
    // OnchainKit has built-in support for Coinbase Wallet, MetaMask, injected wallets, etc.
    // This prevents eip6963RequestProvider errors and keeps connector management simple
    // 
    // Strategy:
    // - Mini Apps (Base App, Farcaster): Use baseAccount + miniAppConnector only
    // - External Browsers: Let OnchainKit's ConnectWallet handle wallet discovery via EIP-6963
    // - OnchainKit automatically detects and supports: Coinbase Wallet, MetaMask, injected wallets, etc.
    
    // Check if we're in a Mini App environment by checking the hostname or parent window
    const isClient = typeof window !== 'undefined';
    const isInMiniApp = isClient && (
      window.location.href.includes('miniapp') ||
      window.location.hostname.includes('base.dev') ||
      window.location.hostname.includes('farcaster.xyz') ||
      // Check if we're in an iframe (Mini Apps run in iframes)
      (window.top !== window.self && window.parent !== window.self) ||
      // Check if there's a parent frame pointing to Base or Farcaster
      (window.parent && window.parent !== window && (
        (window.parent as any).location?.hostname?.includes('base.dev') ||
        (window.parent as any).location?.hostname?.includes('farcaster.xyz')
      ))
    );
    
    if (isInMiniApp) {
      console.log('🚫 Skipped external wallet connectors - detected Mini App environment:', { 
        isClient, 
        isInMiniApp,
        href: isClient ? window.location.href : 'N/A (SSR)',
        hostname: isClient ? window.location.hostname : 'N/A (SSR)',
        note: 'OnchainKit will handle wallet detection for external browsers'
      });
    } else {
      // We don't add injected() or metaMask() connectors because:
      // 1. OnchainKit's ConnectWallet component handles wallet discovery via EIP-6963
      // 2. This prevents EIP-6963 errors in Mini App environments
      // 3. OnchainKit supports: Coinbase Wallet, MetaMask, injected, WalletConnect automatically
      console.log('✅ Using OnchainKit for wallet detection in external browsers (no manual connectors needed)');
    }
    if (hasValidWalletConnectId) {
      connectors.push(
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: 'NewsCast Debate',
            description: 'AI-powered news debate platform',
            url: currentUrl,
            icons: [`${currentUrl}/og-image.png`],
          },
        }) as any
      );
    }

    // Determine default chain based on environment
    const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
    const defaultChain = isTestnet ? baseSepolia : base;

    console.log('🔗 Wagmi Configuration:', {
      isTestnet,
      defaultChain: defaultChain.name,
      chainId: defaultChain.id,
      nodeEnv: process.env.NODE_ENV,
      network: process.env.NEXT_PUBLIC_NETWORK
    });

    wagmiConfig = createConfig({
      chains: [baseSepolia, base, mainnet],
      transports: {
        [baseSepolia.id]: http(),
        [base.id]: http(),
        [mainnet.id]: http(),
      },
      connectors,
      ssr: true,
      autoConnect: true,
      // Set default chain for development/testnet
      ...(isTestnet && { defaultChain: baseSepolia }),
    });
  }
  return wagmiConfig;
})();
