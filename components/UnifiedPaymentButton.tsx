"use client";
import { useState } from 'react';
import BasePaymentButton from './BasePaymentButton';
import FarcasterPaymentButton from './FarcasterPaymentButton';
import { useEnvironmentDetection } from '../hooks/useEnvironmentDetection';

interface UnifiedPaymentButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  amount: string;
  recipientAddress: string;
}

export default function UnifiedPaymentButton({
  onClick,
  disabled = false,
  loading = false,
  children,
  amount,
  recipientAddress
}: UnifiedPaymentButtonProps) {
  const environmentInfo = useEnvironmentDetection();

  // Render appropriate payment component based on environment
  switch (environmentInfo.environment) {
    case 'farcaster':
      return (
        <FarcasterPaymentButton
          onClick={onClick}
          disabled={disabled}
          loading={loading}
          amount={amount}
          recipientAddress={recipientAddress}
        >
          {children}
        </FarcasterPaymentButton>
      );
    
    case 'base':
    case 'external':
    default:
      return (
        <BasePaymentButton
          onClick={onClick}
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