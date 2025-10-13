import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

// Get WalletConnect project ID, only include WalletConnect if valid ID is provided
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const hasValidWalletConnectId = walletConnectProjectId && walletConnectProjectId !== 'your-project-id';

// Log WalletConnect configuration status
if (process.env.NODE_ENV === 'development') {
  console.log('WalletConnect Project ID:', walletConnectProjectId);
  console.log('Has valid WalletConnect ID:', hasValidWalletConnectId);
}

// Build connectors array conditionally
const connectors = [
  // Farcaster connector (for Farcaster environment)
  miniAppConnector(),
  // MetaMask connector
  metaMask({
    dappMetadata: {
      name: 'NewsCast Debate',
      url: 'https://news-debate-onbase-app.vercel.app',
    },
  }),
  // Coinbase Wallet connector (Base Wallet)
  coinbaseWallet({
    appName: 'NewsCast Debate',
    appLogoUrl: 'https://news-debate-onbase-app.vercel.app/og-image.png',
    enableMobileWalletLink: true, // Enable direct connection for mobile
  }),
  // Generic injected connector for all other wallets
  injected(),
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
