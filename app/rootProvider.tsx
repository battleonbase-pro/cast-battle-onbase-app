"use client";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
  
  if (!apiKey) {
    console.error('NEXT_PUBLIC_ONCHAINKIT_API_KEY is not set');
    return <div>Error: Missing API key configuration</div>;
  }

  return (
    <OnchainKitProvider
      apiKey={apiKey}
      chain={base}
    >
      {children}
    </OnchainKitProvider>
  );
}
