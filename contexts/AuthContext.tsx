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

  // Auto-derive from wagmi when address is available
  useEffect(() => {
    if (address && !user) {
      const wagmiUser: AuthUser = {
        address: address,
        isAuthenticated: true,
        environment: 'external'
      };
      console.log('🔗 [AUTH] Deriving user from wagmi:', wagmiUser);
      setUserState(wagmiUser);
    }
  }, [address, user]);

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
