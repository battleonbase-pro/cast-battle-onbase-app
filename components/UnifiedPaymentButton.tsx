"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { BasePayButton } from './BasePayButton';
import { useAccount, useSendTransaction, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { environmentDetector } from '../lib/utils/environment-detector';
import { farcasterPaymentService } from '../lib/services/farcaster-payment-service';

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
  const [hasPaymasterService, setHasPaymasterService] = useState<boolean>(false);
  const { isConnected, address } = useAccount();
  const { sendTransaction } = useSendTransaction();
  const publicClient = usePublicClient();

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

  // Detect Base Account capabilities (only for non-Farcaster environments)
  useEffect(() => {
    const detectBaseAccountCapabilities = async () => {
      if (environment === 'farcaster' || !address || !publicClient) {
        setHasPaymasterService(false);
        return;
      }

      try {
        console.log('🔍 Detecting Base Account capabilities for payments...');
        const caps = await publicClient.request({
          method: 'wallet_getCapabilities',
          params: [address]
        });

        const chainCapabilities = caps[publicClient.chain?.id?.toString() || '84532'] || {};
        const paymasterSupported = chainCapabilities['paymasterService']?.supported || false;
        
        setHasPaymasterService(paymasterSupported);
        console.log('✅ Base Account paymaster service:', paymasterSupported ? 'supported' : 'not supported');
      } catch (error) {
        console.log('⚠️ Could not detect Base Account capabilities:', error);
        setHasPaymasterService(false);
      }
    };

    detectBaseAccountCapabilities();
  }, [environment, address, publicClient]);

  // Handle Farcaster native payment
  const handleFarcasterPayment = async () => {
    try {
      console.log('🔗 Processing Farcaster native payment...');
      
      const result = await farcasterPaymentService.sendUSDCPayment({
        amount,
        recipientAddress,
        onTransactionHash: (hash) => {
          console.log('✅ Farcaster payment transaction hash:', hash);
        },
        onError: (error) => {
          console.error('❌ Farcaster payment error:', error);
        }
      });

      if (result.success) {
        console.log('✅ Farcaster native payment successful');
        await onClick(); // Trigger original onClick after successful payment
      } else {
        throw new Error(result.error || 'Farcaster payment failed');
      }
    } catch (error) {
      console.error('❌ Farcaster native payment failed:', error);
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
        onClick={handleFarcasterPayment}
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
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      colorScheme={colorScheme}
    >
      {hasPaymasterService && environment === 'base' ? `${children} (Gas-Free)` : children}
    </BasePayButton>
  );
}
