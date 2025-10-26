"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';

interface AuthUser {
  address: string;
  isAuthenticated: boolean;
  environment: string;
}

interface FormState {
  castContent: string;
  selectedSide: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  // Form state
  formState: FormState;
  setCastContent: (content: string) => void;
  setSelectedSide: (side: string | null) => void;
  clearFormState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [formState, setFormState] = useState<FormState>({
    castContent: '',
    selectedSide: null
  });
  const { address } = useAccount();

  const setUser = useCallback((newUser: AuthUser | null) => {
    console.log('🔐 [AUTH] Setting user:', newUser);
    setUserState(newUser);
  }, []);

  const clearUser = useCallback(() => {
    console.log('🔐 [AUTH] Clearing user');
    setUserState(null);
  }, []);

  // Form state setters
  const setCastContent = useCallback((content: string) => {
    console.log('📝 [FORM] Setting cast content:', content);
    setFormState(prev => ({ ...prev, castContent: content }));
  }, []);

  const setSelectedSide = useCallback((side: string | null) => {
    console.log('📝 [FORM] Setting selected side:', side);
    setFormState(prev => ({ ...prev, selectedSide: side }));
  }, []);

  const clearFormState = useCallback(() => {
    console.log('📝 [FORM] Clearing form state');
    setFormState({ castContent: '', selectedSide: null });
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
        clearUser,
        formState,
        setCastContent,
        setSelectedSide,
        clearFormState
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
