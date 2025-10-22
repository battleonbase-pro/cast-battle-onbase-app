"use client";
import { useState } from 'react';
import { TransactionButton } from '@coinbase/onchainkit/transaction';
import { parseUnits } from 'viem';
import styles from './BasePaymentButton.module.css';

interface BasePaymentButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  amount: string;
  recipientAddress: string;
}

export default function BasePaymentButton({
  onClick,
  disabled = false,
  loading = false,
  children,
  amount,
  recipientAddress
}: BasePaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // USDC contract address on Base Sepolia
  const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

  const handleTransactionSuccess = () => {
    console.log('✅ Base payment transaction successful');
    setIsProcessing(false);
    onClick(); // Call the original onClick handler
  };

  const handleTransactionError = (error: Error) => {
    console.error('❌ Base payment transaction failed:', error);
    setIsProcessing(false);
  };

  return (
    <div className={styles.paymentButtonContainer}>
      <TransactionButton
        onSuccess={handleTransactionSuccess}
        onError={handleTransactionError}
        disabled={disabled || loading || isProcessing}
        className={styles.transactionButton}
        transaction={{
          to: USDC_CONTRACT_ADDRESS,
          data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${parseUnits(amount, 6).toString(16).padStart(64, '0')}`,
          value: '0',
        }}
        chainId={84532} // Base Sepolia
      >
        {loading || isProcessing ? 'Processing Payment...' : children}
      </TransactionButton>
    </div>
  );
}
