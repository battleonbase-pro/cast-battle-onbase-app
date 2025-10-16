'use client';

import React, { useState, useEffect } from 'react';
import { createBaseAccountSDK, pay, getPaymentStatus } from '@base-org/account';
import { SignInWithBaseButton, BasePayButton } from '@base-org/account-ui/react';

interface BaseAccountIntegrationProps {
  recipient?: string;
  amount?: string;
  onPaymentSuccess?: (paymentId: string) => void;
  onPaymentError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function BaseAccountIntegration({
  recipient = '0x0000000000000000000000000000000000000000',
  amount = '1.00',
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = ''
}: BaseAccountIntegrationProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [sdk, setSdk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize SDK
  useEffect(() => {
    try {
      const baseSDK = createBaseAccountSDK({
        appName: 'Cast Battle',
        appLogoUrl: '/icon.png',
      });
      setSdk(baseSDK);
      console.log('✅ Base Account SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Base Account SDK:', error);
    }
  }, []);

  // Sign-in handler
  const handleSignIn = async () => {
    if (!sdk) return;
    
    try {
      setIsLoading(true);
      await sdk.getProvider().request({ method: 'wallet_connect' });
      setIsSignedIn(true);
      setPaymentStatus('✅ Connected to Base Account');
    } catch (error: any) {
      console.error('Sign in failed:', error);
      setPaymentStatus('❌ Sign in failed');
      onPaymentError?.(error.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Payment handler
  const handlePayment = async () => {
    if (!sdk) return;
    
    try {
      setIsLoading(true);
      setPaymentStatus('Processing payment...');
      
      const result = await pay({
        amount: amount, // USD – SDK quotes equivalent USDC
        to: recipient as `0x${string}`,
        testnet: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NETWORK === 'testnet'
      });

      setPaymentId(result.id);
      setPaymentStatus('✅ Payment initiated! Transaction ID: ' + result.id);
      onPaymentSuccess?.(result.id);
    } catch (error: any) {
      console.error('Payment failed:', error);
      setPaymentStatus('❌ Payment failed: ' + error.message);
      onPaymentError?.(error.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Check payment status
  const handleCheckStatus = async () => {
    if (!paymentId || !sdk) return;
    
    try {
      setIsLoading(true);
      const result = await getPaymentStatus({ id: paymentId });
      setPaymentStatus(`Payment status: ${result.status}`);
    } catch (error: any) {
      console.error('Status check failed:', error);
      setPaymentStatus('❌ Status check failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sdk) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className="text-gray-500">Base Account SDK not available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sign In Button */}
      <SignInWithBaseButton
        align="center"
        variant="solid"
        colorScheme="light"
        size="medium"
        onClick={handleSignIn}
        disabled={disabled || isLoading}
      />

      {/* Sign In Status */}
      {isSignedIn && (
        <div className="text-center text-green-600 text-sm">
          ✅ Connected to Base Account
        </div>
      )}

      {/* Payment Button */}
      <BasePayButton
        colorScheme="light"
        onClick={handlePayment}
        disabled={disabled || isLoading}
      />

      {/* Payment Status */}
      {paymentStatus && (
        <div className="p-3 bg-gray-100 rounded-lg text-sm text-center">
          {paymentStatus}
        </div>
      )}

      {/* Check Status Button */}
      {paymentId && (
        <button
          onClick={handleCheckStatus}
          disabled={disabled || isLoading}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {isLoading ? 'Checking...' : 'Check Payment Status'}
        </button>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center text-gray-500 text-sm">
          Processing...
        </div>
      )}
    </div>
  );
}
