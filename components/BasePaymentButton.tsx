"use client";
import { useEffect, useMemo } from 'react';
import { Transaction, LifecycleStatus, TransactionResponseType } from '@coinbase/onchainkit/transaction';
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

  // Prepare transaction calls for USDC transfer using contract function format
  const calls = useMemo(() => [
    {
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: [
        {
          type: 'function',
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
        },
      ] as const,
      functionName: 'transfer',
      args: [recipientAddress as `0x${string}`, parseUnits(amount, 6)]
    }
  ], [USDC_CONTRACT_ADDRESS, recipientAddress, amount]);

  const handleTransactionStatus = (lifecycleStatus: LifecycleStatus) => {
    console.log('🔍 Transaction status:', lifecycleStatus);
    
    if (lifecycleStatus?.statusName === 'success') {
      console.log('✅ Transaction successful');
      onClick(); // Call the onClick handler
    } else if (lifecycleStatus?.statusName === 'error') {
      console.error('❌ Transaction failed:', lifecycleStatus.statusData);
    }
  };

  const handleTransactionSuccess = (response: TransactionResponseType) => {
    console.log('🎉 Transaction completed successfully:', response);
    
    // Extract transaction hash from the first receipt
    const transactionHash = response.transactionReceipts[0]?.transactionHash;
    
    if (transactionHash) {
      console.log('📝 Transaction hash:', transactionHash);
      onSuccess?.(transactionHash); // Pass the transaction hash to the callback
    }
    
    onClick(); // Call the onClick handler
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
      <Transaction 
        calls={calls} 
        onStatus={handleTransactionStatus}
        onSuccess={handleTransactionSuccess}
        disabled={disabled || loading}
      />
    </div>
  );
}
