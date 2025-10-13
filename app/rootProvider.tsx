"use client";
import { ReactNode } from "react";

export function RootProvider({ children }: { children: ReactNode }) {
  // OnchainKit removed - using wagmi instead
  return <>{children}</>;
}
