"use client";
import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sdk } from '@farcaster/miniapp-sdk';

export function RootProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp(100);
        if (!cancelled) setIsMiniApp(inMiniApp);
      } catch {
        if (!cancelled) setIsMiniApp(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <WagmiProvider config={config} reconnectOnMount autoConnect>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
