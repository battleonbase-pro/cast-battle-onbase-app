'use client';
import { ReactNode } from 'react';
import { base, baseSepolia } from 'viem/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import '@coinbase/onchainkit/styles.css';

export function RootProvider({ children }: { children: ReactNode }) {
  // Use Base Sepolia for testnet, Base for mainnet
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
  const chain = isTestnet ? baseSepolia : base;

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={chain}
      config={{
        appearance: {
          mode: 'auto',
          theme: 'default',
        },
        wallet: {
          display: 'modal',
          preference: 'all',
        },
        analytics: true,
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}