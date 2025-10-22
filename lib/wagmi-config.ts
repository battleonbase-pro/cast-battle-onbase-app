import { http, createConfig } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect, baseAccount } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { sdk } from '@farcaster/miniapp-sdk'

// Custom Phantom connector for better detection
const phantomConnector = injected({
  target: () => ({
    id: 'phantom',
    name: 'Phantom',
    provider: typeof window !== 'undefined' ? window.phantom?.ethereum : undefined,
  }),
  // Ensure it's not confused with WalletConnect
  type: 'injected',
})

// Get WalletConnect project ID, only include WalletConnect if valid ID is provided
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const hasValidWalletConnectId = walletConnectProjectId && 
  walletConnectProjectId !== 'your-project-id' && 
  walletConnectProjectId !== 'your-walletconnect-project-id';

// Log WalletConnect configuration status
if (process.env.NODE_ENV === 'development') {
  console.log('WalletConnect Project ID:', walletConnectProjectId);
  console.log('Has valid WalletConnect ID:', hasValidWalletConnectId);
}

// Function to detect if we're in a Farcaster Mini App
function isFarcasterMiniApp(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    // Synchronous check - we'll handle async detection in components
    return typeof (window as any).farcaster !== 'undefined' || 
           navigator.userAgent.toLowerCase().includes('farcaster') ||
           navigator.userAgent.toLowerCase().includes('warpcast');
  } catch {
    return false;
  }
}

// Build connectors array based on environment detection
const inFarcasterMiniApp = isFarcasterMiniApp();
let connectors;

if (inFarcasterMiniApp) {
  // In Farcaster Mini App - prioritize Farcaster connector
  console.log('🔗 Detected Farcaster Mini App - prioritizing Farcaster connector');
  connectors = [
    miniAppConnector(), // Farcaster connector first
    baseAccount({
      appName: 'NewsCast Debate',
    }),
    metaMask({
      dappMetadata: {
        name: 'NewsCast Debate',
        url: 'https://news-debate-onbase-app.vercel.app',
      },
    }),
    phantomConnector,
  ];
} else {
  // In Base app or external browser - prioritize Base Account
  console.log('🔵 Detected Base app or external browser - prioritizing Base Account connector');
  connectors = [
    baseAccount({
      appName: 'NewsCast Debate',
    }),
    miniAppConnector(), // Farcaster connector as fallback
    metaMask({
      dappMetadata: {
        name: 'NewsCast Debate',
        url: 'https://news-debate-onbase-app.vercel.app',
      },
    }),
    phantomConnector,
  ];
}
if (hasValidWalletConnectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      metadata: {
        name: 'NewsCast Debate',
        description: 'AI-powered news debate platform',
        url: 'https://news-debate-onbase-app.vercel.app',
        icons: ['https://news-debate-onbase-app.vercel.app/og-image.png'],
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

export const config = createConfig({
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
})
