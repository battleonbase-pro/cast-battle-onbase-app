"use client";
import { useState, useEffect } from 'react';
import { BasePayButton } from './BasePayButton';
import { useAccount } from 'wagmi';
import { environmentDetector } from '../lib/utils/environment-detector';
import { paymentService } from '../lib/services/payment-service';
import { useBaseAccountCapabilities } from '../lib/services/base-account-capabilities-service';

interface UnifiedPaymentButtonProps {
  onClick: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  colorScheme?: 'light' | 'dark';
  children: React.ReactNode;
  amount?: string; // Payment amount in USDC
  recipientAddress?: string; // Payment recipient address
}

export function UnifiedPaymentButton({
  onClick,
  disabled = false,
  loading = false,
  colorScheme = 'light',
  children,
  amount = '1.00', // Default 1 USDC
  recipientAddress = '0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271' // Default recipient
}: UnifiedPaymentButtonProps) {
  const [isDetecting, setIsDetecting] = useState<boolean>(true);
  const [environment, setEnvironment] = useState<'farcaster' | 'base' | 'external'>('external');
  const { address } = useAccount();
  
  // Use Base Account capabilities hook
  const { capabilities } = useBaseAccountCapabilities(address);

  // Detect environment using improved detection
  useEffect(() => {
    const detectEnvironment = async () => {
      try {
        const envInfo = await environmentDetector.detectEnvironment();
        setEnvironment(envInfo.environment);
        console.log('🔍 Payment button environment detected:', envInfo.environment);
      } catch (error) {
        console.error('❌ Environment detection failed:', error);
        setEnvironment('external');
      } finally {
        setIsDetecting(false);
      }
    };
    detectEnvironment();
  }, []);

  // Handle payment processing
  const handlePayment = async () => {
    try {
      console.log('💰 Processing payment...');
      
      const result = await paymentService.processPayment({
        amount,
        recipientAddress,
        onTransactionHash: (hash) => {
          console.log('✅ Payment transaction hash:', hash);
        },
        onError: (error) => {
          console.error('❌ Payment error:', error);
        }
      });

      if (result.success) {
        console.log('✅ Payment successful, calling onClick...');
        // Call the original onClick handler with the transaction ID
        await onClick();
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      throw error;
    }
  };

  // Show loading state while detecting environment
  if (isDetecting) {
    return (
      <BasePayButton
        onClick={() => {}}
        disabled={true}
        loading={true}
        colorScheme={colorScheme}
      >
        Loading...
      </BasePayButton>
    );
  }

  // In Farcaster Mini App - use Farcaster native payment
  if (environment === 'farcaster') {
    return (
      <button
        type="button"
        onClick={handlePayment}
        disabled={disabled || loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: colorScheme === 'light' ? '#ffffff' : '#8B5CF6',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          color: colorScheme === 'light' ? '#000000' : '#ffffff',
          minWidth: '180px',
          height: '44px',
          opacity: disabled || loading ? 0.6 : 1
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          backgroundColor: colorScheme === 'light' ? '#8B5CF6' : '#FFFFFF',
          borderRadius: '2px',
          flexShrink: 0
        }} />
        <span>
          {loading ? 'Processing...' : children}
        </span>
      </button>
    );
  }

  // In Base app or external browser - use Base Pay
  return (
    <BasePayButton
      onClick={handlePayment}
      disabled={disabled}
      loading={loading}
      colorScheme={colorScheme}
    >
      {capabilities.paymasterService && environment === 'base' ? `${children} (Gas-Free)` : children}
    </BasePayButton>
  );
}
