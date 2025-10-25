"use client";
import { useEffect } from 'react';
import { useSendToken } from '@coinbase/onchainkit/minikit';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import styles from './BasePaymentButton.module.css';

interface BasePaymentButtonProps {
  onClick: () => void;
  onSuccess?: (transactionId?: string) => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  amount: string;
  recipientAddress: string;
}

export default function BasePaymentButton({
  onClick,
  onSuccess: _onSuccess,
  disabled = false,
  loading = false,
  children,
  amount,
  recipientAddress
}: BasePaymentButtonProps) {
  const { address, isConnected } = useAccount();

  // Use MiniKit's useSendToken hook for proper authorization
  const { sendToken, isPending, error } = useSendToken();

  // USDC contract address on Base Sepolia
  const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

  const handlePayment = () => {
    if (!isConnected || !address) {
      console.error('❌ Wallet not connected');
      return;
    }

    console.log('🚀 Initiating USDC payment via MiniKit useSendToken...');
    
    // Use MiniKit's sendToken for proper authorization
    // This opens a UI form for the user to confirm the transaction
    sendToken({
      token: `eip155:84532/erc20:${USDC_CONTRACT_ADDRESS}`, // Base Sepolia USDC
      amount: parseUnits(amount, 6).toString(), // Convert to wei (6 decimals for USDC)
      recipientAddress: recipientAddress,
    });

    // Note: sendToken opens a UI form and handles the transaction flow
    // We'll need to handle success/failure through other means (event listeners or polling)
    // For now, we'll call the onClick handler immediately
    onClick();
  };

  // Debug logging
  useEffect(() => {
    console.log('🔧 BasePaymentButton Configuration:', {
      USDC_CONTRACT_ADDRESS,
      recipientAddress,
      amount,
      isConnected,
      address,
      isPending,
      error: error?.message
    });
  }, [USDC_CONTRACT_ADDRESS, recipientAddress, amount, isConnected, address, isPending, error]);

  // If wallet is not connected, show connect message
  if (!isConnected || !address) {
    console.log('⚠️ BasePaymentButton: Wallet not connected or no address available');
    return (
      <div className={styles.paymentButtonContainer}>
        <button
          disabled={true}
          className={styles.transactionButton}
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          Connect Wallet First
        </button>
      </div>
    );
  }

  return (
    <div className={styles.paymentButtonContainer}>
      <button
        onClick={handlePayment}
        disabled={disabled || loading || isPending}
        className={styles.transactionButton}
      >
        {loading || isPending
          ? `Processing ${amount} USDC Payment...`
          : children
        }
      </button>
      {error && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: '#fee2e2', 
          color: '#dc2626', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
