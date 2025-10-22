"use client";
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { paymentService } from '../lib/services/payment-service';
import { environmentDetector } from '../lib/utils/environment-detector';

interface UnifiedPaymentButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  colorScheme?: 'light' | 'dark';
  amount?: string;
  recipientAddress?: string;
  children: React.ReactNode;
}

export const UnifiedPaymentButton: React.FC<UnifiedPaymentButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  colorScheme: _colorScheme = 'light',
  amount = '1.00',
  recipientAddress = '0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271',
  children
}) => {
  const [environment, setEnvironment] = useState<'farcaster' | 'base' | 'external'>('external');
  const [capabilities, setCapabilities] = useState<{
    gasFree: boolean;
    supported: boolean;
    method: string;
  }>({
    gasFree: false,
    supported: false,
    method: 'Unknown'
  });
  const [isDetecting, setIsDetecting] = useState(true);
  const { } = useAccount();

  // Detect environment and capabilities
  useEffect(() => {
    const detectEnvironment = async () => {
      try {
        setIsDetecting(true);
        
        const detectedEnvironment = await environmentDetector.detectEnvironment();
        setEnvironment(detectedEnvironment);
        
        const paymentCapabilities = await paymentService.getPaymentCapabilities();
        setCapabilities(paymentCapabilities);
        
        console.log('🌐 Payment environment:', detectedEnvironment);
        console.log('💰 Payment capabilities:', paymentCapabilities);
        
      } catch (error) {
        console.error('❌ Error detecting payment environment:', error);
        setEnvironment('external');
        setCapabilities({
          gasFree: false,
          supported: false,
          method: 'Unknown'
        });
      } finally {
        setIsDetecting(false);
      }
    };

    detectEnvironment();
  }, []);

  // Handle payment
  const handlePayment = async () => {
    if (!capabilities.supported) {
      console.error('❌ Payment not supported in current environment');
      return;
    }

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
        console.log('✅ Payment successful');
        // Call the original onClick handler after successful payment
        onClick();
      } else {
        console.error('❌ Payment failed:', result.error);
      }

    } catch (error) {
      console.error('❌ Payment processing error:', error);
    }
  };

  const isDisabled = disabled || loading || !capabilities.supported || isDetecting;

  // Render appropriate button based on environment
  if (environment === 'farcaster') {
    return (
      <button
        type="button"
        onClick={handlePayment}
        disabled={isDisabled}
        className="unified-payment-button farcaster-pay"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '14px 20px',
          backgroundColor: '#8B5CF6',
          border: 'none',
          borderRadius: '12px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
          fontWeight: '600',
          color: '#ffffff',
          minWidth: '200px',
          height: '52px',
          opacity: isDisabled ? 0.6 : 1,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
        }}
      >
        {loading ? (
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #ffffff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <>
            <span>🔗</span>
            <span>{children}</span>
          </>
        )}
        {capabilities.gasFree && (
          <span style={{ fontSize: '12px', opacity: 0.8 }}>
            Gas-Free
          </span>
        )}
      </button>
    );
  }

  // Base App or External Browser - use Base Pay
  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={isDisabled}
      className="unified-payment-button base-pay"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '14px 20px',
        backgroundColor: '#0052FF',
        border: 'none',
        borderRadius: '12px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        fontWeight: '600',
        color: '#ffffff',
        minWidth: '200px',
        height: '52px',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 82, 255, 0.3)',
      }}
    >
      {loading ? (
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid #ffffff',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <>
          <span>🔵</span>
          <span>{children}</span>
        </>
      )}
      {capabilities.gasFree && (
        <span style={{ fontSize: '12px', opacity: 0.8 }}>
          Gas-Free
        </span>
      )}
    </button>
  );
};

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);