'use client';

import React, { useState, useEffect } from 'react';
import { baseAccountService, BaseAccountUser, PaymentResult } from '@/lib/services/base-account-service';

interface BaseAccountPaymentProps {
  debateId: number;
  entryFee: string;
  onPaymentSuccess?: (result: PaymentResult) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

export default function BaseAccountPayment({
  debateId,
  entryFee,
  onPaymentSuccess,
  onPaymentError,
  className = ''
}: BaseAccountPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<BaseAccountUser | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [hasBalance, setHasBalance] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  useEffect(() => {
    if (isAvailable) {
      checkUserStatus();
    }
  }, [isAvailable]);

  useEffect(() => {
    if (user) {
      checkBalance();
    }
  }, [user, entryFee]);

  const checkAvailability = async () => {
    const available = baseAccountService.isAvailable();
    setIsAvailable(available);
  };

  const checkUserStatus = async () => {
    try {
      const signedIn = await baseAccountService.isSignedIn();
      if (signedIn) {
        const account = await baseAccountService.getBaseAccount();
        setUser(account);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const checkBalance = async () => {
    try {
      const balance = await baseAccountService.getUSDCBalance();
      setUsdcBalance(balance);
      
      const sufficient = await baseAccountService.hasSufficientBalance(entryFee);
      setHasBalance(sufficient);
    } catch (error) {
      console.error('Error checking balance:', error);
      setHasBalance(false);
    }
  };

  const handleJoinDebate = async () => {
    try {
      setIsLoading(true);
      
      console.log(`🎯 Joining debate ${debateId} with ${entryFee} USDC`);
      
      const result = await baseAccountService.joinDebateWithPayment(debateId, entryFee);
      
      if (result.success) {
        console.log('✅ Successfully joined debate!');
        onPaymentSuccess?.(result);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('❌ Failed to join debate:', error);
      onPaymentError?.(error.message || 'Failed to join debate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      const account = await baseAccountService.signIn();
      setUser(account);
      await checkBalance();
    } catch (error: any) {
      console.error('❌ Sign-in failed:', error);
      onPaymentError?.(error.message || 'Sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="text-gray-500 text-sm">
          Base Account not available. Please use a regular wallet connection.
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Join Debate with Base Account</h3>
          <p className="text-gray-600 text-sm mb-4">
            Sign in with Base Account for universal access and one-tap USDC payments
          </p>
        </div>
        
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Base Account'}
        </button>
        
        <div className="mt-2 text-xs text-gray-500">
          Universal sign-on • One-tap payments • No gas fees
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Join Debate</h3>
        <div className="text-sm text-gray-600 mb-2">
          Entry Fee: <span className="font-medium">{entryFee} USDC</span>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {user.name ? user.name[0].toUpperCase() : user.address[0].toUpperCase()}
            </span>
          </div>
          <div className="text-sm">
            <div className="font-medium">{user.name || 'Base Account User'}</div>
            <div className="text-gray-500">
              Balance: {usdcBalance} USDC
            </div>
          </div>
        </div>
      </div>

      {!hasBalance ? (
        <div className="text-center">
          <div className="text-red-600 text-sm mb-2">
            Insufficient USDC balance
          </div>
          <div className="text-xs text-gray-500">
            Required: {entryFee} USDC • Available: {usdcBalance} USDC
          </div>
        </div>
      ) : (
        <button
          onClick={handleJoinDebate}
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing Payment...' : `Pay ${entryFee} USDC & Join Debate`}
        </button>
      )}
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        One-tap payment • Gas sponsored • Secure
      </div>
    </div>
  );
}
