"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';

interface AuthUser {
  address: string;
  isAuthenticated: boolean;
  environment: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const { address } = useAccount();

  const setUser = useCallback((newUser: AuthUser | null) => {
    console.log('🔐 [AUTH] Setting user:', newUser);
    setUserState(newUser);
  }, []);

  const clearUser = useCallback(() => {
    console.log('🔐 [AUTH] Clearing user');
    setUserState(null);
  }, []);

  // Note: We do NOT auto-derive from wagmi address here
  // Instead, we let the auth flow (UnifiedAuth components) manually call setUser
  // This ensures users explicitly sign in and go through the proper auth flow
  // The wagmi address is used only for payment transactions, not for authentication

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        setUser, 
        clearUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
