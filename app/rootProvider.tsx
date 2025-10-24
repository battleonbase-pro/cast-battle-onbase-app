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

export function RootProvider({ children }: { children: ReactNode }) {
  console.log('🔧 RootProvider initialization:', {
    hasApiKey: !!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    apiKeyLength: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY?.length,
    chain: base.name,
    chainId: base.id,
    miniKitEnabled: true,
    autoConnect: true
  });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
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
