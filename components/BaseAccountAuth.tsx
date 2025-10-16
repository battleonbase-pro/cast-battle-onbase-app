'use client';

import React, { useState, useEffect } from 'react';
import { baseAccountService, BaseAccountUser } from '@/lib/services/base-account-service';

interface BaseAccountAuthProps {
  onUserChange?: (user: BaseAccountUser | null) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function BaseAccountAuth({
  onUserChange,
  onError,
  className = ''
}: BaseAccountAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<BaseAccountUser | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  useEffect(() => {
    if (isAvailable) {
      checkSignInStatus();
    }
  }, [isAvailable]);

  const checkAvailability = async () => {
    const available = baseAccountService.isAvailable();
    setIsAvailable(available);
    
    if (!available) {
      console.log('⚠️ Base Account SDK not available');
    }
  };

  const checkSignInStatus = async () => {
    try {
      const signedIn = await baseAccountService.isSignedIn();
      setIsSignedIn(signedIn);
      
      if (signedIn) {
        const account = await baseAccountService.getBaseAccount();
        setUser(account);
        onUserChange?.(account);
      } else {
        setUser(null);
        onUserChange?.(null);
      }
    } catch (error) {
      console.error('Error checking sign-in status:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      const account = await baseAccountService.signIn();
      
      setUser(account);
      setIsSignedIn(true);
      onUserChange?.(account);
      
      console.log('✅ Signed in with Base Account:', account);
    } catch (error: any) {
      console.error('❌ Sign-in failed:', error);
      onError?.(error.message || 'Sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await baseAccountService.signOut();
      
      setUser(null);
      setIsSignedIn(false);
      onUserChange?.(null);
      
      console.log('✅ Signed out from Base Account');
    } catch (error: any) {
      console.error('❌ Sign-out failed:', error);
      onError?.(error.message || 'Sign-out failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="text-gray-500 text-sm">
          Base Account not available
        </div>
      </div>
    );
  }

  if (isSignedIn && user) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.name ? user.name[0].toUpperCase() : user.address[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium">
              {user.name || 'Base Account User'}
            </div>
            <div className="text-xs text-gray-500">
              {user.address.slice(0, 6)}...{user.address.slice(-4)}
            </div>
            {user.email && (
              <div className="text-xs text-gray-400">
                {user.email}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign in with Base Account'}
      </button>
      
      <div className="mt-2 text-xs text-gray-500">
        Universal sign-on • One-tap payments
      </div>
    </div>
  );
}
