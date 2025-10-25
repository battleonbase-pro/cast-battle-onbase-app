"use client";
import { useEffect, useMemo } from 'react';
import { Transaction, TransactionButton, LifecycleStatus } from '@coinbase/onchainkit/transaction';
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
  onSuccess,
  disabled = false,
  loading = false,
  children: _children,
  amount,
  recipientAddress
}: BasePaymentButtonProps) {
  const { address, isConnected } = useAccount();

  // USDC contract address on Base Sepolia
  const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

  // Prepare transaction calls for USDC transfer
  const calls = useMemo(() => [
    {
      to: USDC_CONTRACT_ADDRESS as `0x${string}`,
      data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${parseUnits(amount, 6).toString(16).padStart(64, '0')}` as `0x${string}`
    }
  ], [USDC_CONTRACT_ADDRESS, recipientAddress, amount]);

  const handleTransactionStatus = (lifecycleStatus: LifecycleStatus) => {
    console.log('🔍 Transaction status:', lifecycleStatus);
    
    if (lifecycleStatus?.statusName === 'success') {
      console.log('✅ Transaction successful');
      onClick(); // Call the onClick handler
      onSuccess?.(); // Call the onSuccess callback
    } else if (lifecycleStatus?.statusName === 'error') {
      console.error('❌ Transaction failed');
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('🔧 BasePaymentButton Configuration:', {
      USDC_CONTRACT_ADDRESS,
      recipientAddress,
      amount,
      isConnected,
      address,
      calls
    });
  }, [USDC_CONTRACT_ADDRESS, recipientAddress, amount, isConnected, address, calls]);

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
      <Transaction calls={calls} onStatus={handleTransactionStatus}>
        <TransactionButton disabled={disabled || loading} />
      </Transaction>
    </div>
  );
}
