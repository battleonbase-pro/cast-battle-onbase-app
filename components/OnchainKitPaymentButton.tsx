"use client";
import React, { useState, useEffect } from 'react';
import { TransactionButton, useAccount } from '@coinbase/onchainkit';
import { parseUnits } from 'viem';
import { useAccount as useWagmiAccount } from 'wagmi';

interface OnchainKitPaymentButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  amount?: string;
  recipientAddress?: string;
  children: React.ReactNode;
}

export const OnchainKitPaymentButton: React.FC<OnchainKitPaymentButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  amount = '1.00',
  recipientAddress = '0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271',
  children
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { address, isConnected } = useWagmiAccount();

  const handleTransactionSuccess = () => {
    console.log('✅ Payment transaction successful');
    setIsProcessing(false);
    // Call the original onClick handler after successful payment
    onClick();
  };

  const handleTransactionError = (error: Error) => {
    console.error('❌ Payment transaction failed:', error);
    setIsProcessing(false);
  };

  if (!isConnected || !address) {
    return (
      <button
        disabled={true}
        className="payment-button disabled"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '14px 20px',
          backgroundColor: '#6b7280',
          border: 'none',
          borderRadius: '12px',
          cursor: 'not-allowed',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
          fontWeight: '600',
          color: '#ffffff',
          minWidth: '200px',
          height: '52px',
          opacity: 0.6,
        }}
      >
        <span>🔒</span>
        <span>Connect Wallet First</span>
      </button>
    );
  }

  return (
    <TransactionButton
      transaction={{
        to: recipientAddress,
        value: parseUnits(amount, 18), // Assuming ETH payment
        data: '0x', // Empty data for simple ETH transfer
      }}
      onTransactionConfirmed={handleTransactionSuccess}
      onTransactionError={handleTransactionError}
      render={({ onClick: onTransactionClick, status, isLoading }) => (
        <button
          onClick={onTransactionClick}
          disabled={disabled || loading || isLoading || isProcessing}
          className="payment-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px 20px',
            backgroundColor: '#0052FF',
            border: 'none',
            borderRadius: '12px',
            cursor: disabled || loading || isLoading || isProcessing ? 'not-allowed' : 'pointer',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffffff',
            minWidth: '200px',
            height: '52px',
            opacity: disabled || loading || isLoading || isProcessing ? 0.6 : 1,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 82, 255, 0.3)',
          }}
        >
          {isLoading || isProcessing ? (
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
          <span style={{ fontSize: '12px', opacity: 0.8 }}>
            Gas-Free
          </span>
        </button>
      )}
    />
  );
};

// Add CSS for spinner animation only on client-side
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
