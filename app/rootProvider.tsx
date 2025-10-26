'use client';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base, baseSepolia } from 'viem/chains';
import '@coinbase/onchainkit/styles.css';
import { config } from '@/lib/wagmi-config';

// Create a QueryClient outside component to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

interface RootProviderProps {
  children: ReactNode;
  apiKey: string;
}

export function RootProvider({ children, apiKey }: RootProviderProps) {
  // Determine testnet based on environment
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
  const chain = isTestnet ? baseSepolia : base;

  console.log('🔧 RootProvider initialization:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined',
    chain: chain.name,
    chainId: chain.id,
    isTestnet,
    miniKitEnabled: true,
    autoConnect: true,
    nodeEnv: process.env.NODE_ENV,
    note: 'Using custom wagmi config for Mini App connectors'
  });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={apiKey}
          chain={chain}
          config={{
            appearance: {
              mode: 'auto',
            },
            wallet: {
              display: 'modal',
              preference: 'all',
            },
          }}
          miniKit={{
            enabled: true,
            autoConnect: true,
            notificationProxyUrl: undefined,
          }}
        >
          <MiniKitProvider>
            {children}
          </MiniKitProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
