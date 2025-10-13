import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect, baseAccount } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

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

// Build connectors array conditionally
const connectors = [
  // Farcaster connector (for Farcaster environment)
  miniAppConnector(),
  // Base Account connector (official Base ecosystem integration)
  baseAccount({
    appName: 'NewsCast Debate',
  }),
  // MetaMask connector
  metaMask({
    dappMetadata: {
      name: 'NewsCast Debate',
      url: 'https://news-debate-onbase-app.vercel.app',
    },
  }),
  // Phantom connector (for better detection)
  phantomConnector,
];

// Only add WalletConnect if we have a valid project ID
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

export const config = createConfig({
  chains: [base, mainnet],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  connectors,
})
