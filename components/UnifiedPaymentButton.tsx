"use client";
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
  
  // Debug logging
  console.log('🔍 UnifiedPaymentButton - Environment info:', environmentInfo);

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
    case 'base':
      // Both Farcaster and Base Mini Apps use FarcasterPaymentButton
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