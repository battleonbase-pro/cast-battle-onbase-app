'use client';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
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

export function RootProvider({ children }: { children: ReactNode }) {
  console.log('🔧 RootProvider initialization:', {
    hasApiKey: !!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    apiKeyLength: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY?.length,
    chain: config.chains[0]?.name,
    chainId: config.chains[0]?.id,
    miniKitEnabled: true
  });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={config.chains[0]} // Use the first chain from the config
          config={{
            appearance: {
              mode: 'auto',
            },
            wallet: {
              display: 'modal',
            },
          }}
          miniKit={{
            enabled: true
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
