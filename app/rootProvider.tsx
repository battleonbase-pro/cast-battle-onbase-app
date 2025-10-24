'use client';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import '@coinbase/onchainkit/styles.css';
import { config } from '@/lib/wagmi-config';

// Create QueryClient outside component to prevent recreation on every render
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
  console.log('🔧 RootProvider initialization:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined',
    chain: base.name,
    chainId: base.id,
    miniKitEnabled: true,
    autoConnect: true,
    nodeEnv: process.env.NODE_ENV
  });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={apiKey}
          chain={base}
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
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
