'use client';
import { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base, baseSepolia } from 'viem/chains';
import '@coinbase/onchainkit/styles.css';
import { AuthProvider } from '@/contexts/AuthContext';

interface RootProviderProps {
  children: ReactNode;
  apiKey: string;
}

export function RootProvider({ children, apiKey }: RootProviderProps) {
  // Determine testnet based on environment
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
  const chain = isTestnet ? baseSepolia : base;

  // Simplified setup: Let OnchainKitProvider handle wagmi and react-query internally
  // When miniKit is enabled, it automatically configures Farcaster connector
  return (
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </MiniKitProvider>
    </OnchainKitProvider>
  );
}
