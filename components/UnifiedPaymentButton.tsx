"use client";
import { useEffect } from 'react';
import BasePaymentButton from './BasePaymentButton';
import FarcasterPaymentButton from './FarcasterPaymentButton';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';

interface UnifiedPaymentButtonProps {
  onClick: () => void;
  onSuccess?: (transactionId?: string) => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  amount: string;
  recipientAddress: string;
}

export default function UnifiedPaymentButton({
  onClick,
  onSuccess,
  disabled = false,
  loading = false,
  children,
  amount,
  recipientAddress
}: UnifiedPaymentButtonProps) {
  const environmentInfo = useEnvironmentDetection();
  
  // Debug logging - log when environment is detected
  useEffect(() => {
    if (!environmentInfo.isLoading) {
      console.log('🔍 UnifiedPaymentButton - Environment detected:', environmentInfo.environment);
    }
  }, [environmentInfo.environment, environmentInfo.isLoading]);

  // Show loading state while detecting environment
  if (environmentInfo.isLoading) {
    return (
      <div style={{ 
        padding: '12px 24px', 
        backgroundColor: '#f3f4f6', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        🔍 Detecting environment...
      </div>
    );
  }

  // Render appropriate payment component based on environment
  switch (environmentInfo.environment) {
    case 'farcaster':
      // Farcaster Mini App uses FarcasterPaymentButton
      return (
        <FarcasterPaymentButton
          onClick={onClick}
          onSuccess={onSuccess}
          disabled={disabled}
          loading={loading}
          amount={amount}
          recipientAddress={recipientAddress}
        >
          {children}
        </FarcasterPaymentButton>
      );
    
    case 'base':
      // Base App Mini App uses BasePaymentButton (OnchainKit Transaction component)
      return (
        <BasePaymentButton
          onClick={onClick}
          onSuccess={onSuccess}
          disabled={disabled}
          loading={loading}
          amount={amount}
          recipientAddress={recipientAddress}
        >
          {children}
        </BasePaymentButton>
      );
    
    case 'external':
    default:
      // External browsers use BasePaymentButton
      return (
        <BasePaymentButton
          onClick={onClick}
          onSuccess={onSuccess}
          disabled={disabled}
          loading={loading}
          amount={amount}
          recipientAddress={recipientAddress}
        >
          {children}
        </BasePaymentButton>
      );
  }
}