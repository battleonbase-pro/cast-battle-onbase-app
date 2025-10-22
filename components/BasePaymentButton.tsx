"use client";
import { useState } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { parseUnits, encodeFunctionData } from 'viem';
import { erc20Abi } from 'viem';
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

  // For testing: Use ETH transfer instead of USDC
  // TODO: Switch back to USDC transfer once testing is complete
  const ethAmount = parseUnits('0.001', 18); // 0.001 ETH for testing

  console.log('🔧 Base Payment Transaction Details:');
  console.log('  - Recipient:', recipientAddress);
  console.log('  - Amount:', '0.001 ETH (testing)');
  console.log('  - Chain ID:', 84532);

  return (
    <div className={styles.paymentButtonContainer}>
      <Transaction
        calls={[{
          to: recipientAddress as `0x${string}`,
          data: '0x', // Empty data for ETH transfer
          value: ethAmount.toString(),
        }]}
        chainId={84532} // Base Sepolia
        onSuccess={handleTransactionSuccess}
        onError={handleTransactionError}
      >
        <TransactionButton
          disabled={disabled || loading || isProcessing}
          className={styles.transactionButton}
        >
          {loading || isProcessing ? 'Processing Payment...' : children}
        </TransactionButton>
      </Transaction>
    </div>
  );
}
