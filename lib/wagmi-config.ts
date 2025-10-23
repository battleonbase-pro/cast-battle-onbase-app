import { http, createConfig } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect, baseAccount } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { sdk } from '@farcaster/miniapp-sdk'


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

// Log WalletConnect configuration status
if (process.env.NODE_ENV === 'development') {
  console.log('WalletConnect Project ID:', walletConnectProjectId);
  console.log('Has valid WalletConnect ID:', hasValidWalletConnectId);
  console.log('Current URL for metadata:', currentUrl);
}

// Build connectors array - we'll detect environment asynchronously in components
// For now, prioritize Base Account as default, components will handle Farcaster detection
console.log('🔗 Initializing connectors - environment detection will be handled asynchronously');
const connectors = [
  baseAccount({
    appName: 'NewsCast Debate',
  }),
  miniAppConnector(), // Farcaster connector as fallback
  metaMask({
    dappMetadata: {
      name: 'NewsCast Debate',
      url: currentUrl,
    },
  }),
];
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
