"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { BasePayButton } from './BasePayButton';
import { useAccount, useSendTransaction, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';

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
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(true);
  const [hasPaymasterService, setHasPaymasterService] = useState<boolean>(false);
  const { isConnected, address } = useAccount();
  const { sendTransaction } = useSendTransaction();
  const publicClient = usePublicClient();

  // Detect Farcaster Mini App environment
  useEffect(() => {
    const detectMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
      } catch {
        setIsMiniApp(false);
      } finally {
        setIsDetecting(false);
      }
    };
    detectMiniApp();
  }, []);

  // Detect Base Account capabilities (only for non-Farcaster environments)
  useEffect(() => {
    const detectBaseAccountCapabilities = async () => {
      if (isMiniApp || !address || !publicClient) {
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
  }, [isMiniApp, address, publicClient]);

  // Handle Farcaster wallet payment
  const handleFarcasterPayment = async () => {
    try {
      console.log('🔐 Processing Farcaster wallet payment...');
      
      // USDC contract address on Base
      const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      // Parse amount (USDC has 6 decimals)
      const amountWei = parseUnits(amount, 6);
      
      // Create transaction data for USDC transfer
      const transactionData = {
        to: usdcAddress,
        data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${amountWei.toString(16).padStart(64, '0')}`,
        value: '0x0' // No ETH value for token transfer
      };

      console.log('📝 Transaction data:', transactionData);

      // Send transaction using Farcaster wallet
      const hash = await sendTransaction({
        to: transactionData.to as `0x${string}`,
        data: transactionData.data as `0x${string}`,
        value: BigInt(transactionData.value)
      });

      console.log('✅ Farcaster payment successful:', hash);
      
      // Call the original onClick handler
      await onClick();
      
    } catch (error) {
      console.error('❌ Farcaster payment failed:', error);
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

  // In Farcaster Mini App - use Farcaster wallet
  if (isMiniApp) {
    return (
      <button
        type="button"
        onClick={handleFarcasterPayment}
        disabled={disabled || loading || !isConnected}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: colorScheme === 'light' ? '#ffffff' : '#0000FF',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled || loading || !isConnected ? 'not-allowed' : 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          color: colorScheme === 'light' ? '#000000' : '#ffffff',
          minWidth: '180px',
          height: '44px',
          opacity: disabled || loading || !isConnected ? 0.6 : 1
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          backgroundColor: colorScheme === 'light' ? '#0000FF' : '#FFFFFF',
          borderRadius: '2px',
          flexShrink: 0
        }} />
        <span>
          {loading ? 'Processing...' : 
           hasPaymasterService ? `${children} (Gas-Free)` : children}
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
      {hasPaymasterService ? `${children} (Gas-Free)` : children}
    </BasePayButton>
  );
}
