import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base, mainnet],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [
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
    }),
    // Rabby Wallet connector
    injected({
      target: 'rabby',
    }),
    // WalletConnect connector (for mobile wallets)
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
      metadata: {
        name: 'NewsCast Debate',
        description: 'AI-powered news debate platform',
        url: 'https://news-debate-onbase-app.vercel.app',
        icons: ['https://news-debate-onbase-app.vercel.app/og-image.png'],
      },
    }),
    // Phantom Wallet connector
    injected({
      target: 'phantom',
    }),
    // Trust Wallet connector
    injected({
      target: 'trust',
    }),
  ],
})
