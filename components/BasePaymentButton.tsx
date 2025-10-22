"use client";
import { useState, useEffect } from 'react';
import { Transaction, TransactionButton } from '@coinbase/onchainkit/transaction';
import { parseUnits, encodeFunctionData } from 'viem';
import { erc20Abi } from 'viem';
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
  children,
  amount,
  recipientAddress
}: BasePaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCalledSuccess, setHasCalledSuccess] = useState(false);
  const { address, isConnected } = useAccount();

  // USDC contract address on Base Sepolia
  const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

  const handleTransactionSuccess = (transactionData?: any) => {
    if (hasCalledSuccess) {
      console.log('⚠️ Success already called, skipping...');
      return;
    }
    
    console.log('✅ Payment transaction successful');
    console.log('🎉 Thank you for your participation!');
    console.log('📝 Transaction data:', transactionData);
    
    // Extract transaction hash from OnchainKit response
    let transactionHash: string | undefined;
    if (typeof transactionData === 'string') {
      transactionHash = transactionData;
    } else if (transactionData && transactionData.transactionReceipts && Array.isArray(transactionData.transactionReceipts)) {
      // Extract hash from the first transaction receipt
      transactionHash = transactionData.transactionReceipts[0]?.transactionHash;
    } else if (transactionData && transactionData.hash) {
      transactionHash = transactionData.hash;
    }
    
    console.log('📝 Extracted transaction hash:', transactionHash);
    
    setIsProcessing(false);
    setHasCalledSuccess(true);
    
    // Call the success callback with transaction hash
    if (onSuccess) {
      onSuccess(transactionHash);
    }
  };

  const handleTransactionError = (error: Error) => {
    console.error('❌ Base payment transaction failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    setIsProcessing(false);
  };

  // USDC payment for debate participation
  const usdcAmount = parseUnits('1', 6); // 1 USDC (USDC has 6 decimals)
  // Try the official Base Sepolia USDC contract
  const usdcContractAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS!; // USDC on Base Sepolia
  
  // Base Sepolia testnet configuration - USE USDC NOT ETH
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
  const testMode = false; // Always use USDC, never ETH
  const ethAmount = parseUnits('0.001', 18); // Not used anymore

  // Only log once when component mounts or key values change
  useEffect(() => {
    console.log('🔧 Base Sepolia USDC Payment Configuration:');
    console.log('  - Network: Base Sepolia (Testnet)');
    console.log('  - Payment: 1 USDC Transfer');
    console.log('  - USDC Contract:', usdcContractAddress);
    console.log('  - Recipient (DebatePool):', recipientAddress);
    console.log('  - Amount: 1 USDC');
    console.log('  - Chain ID:', 84532);
    console.log('  - Wallet Connected:', isConnected);
    console.log('  - Wallet Address:', address);
    console.log('  - Environment:', process.env.NODE_ENV);
    console.log('  - Network Setting:', process.env.NEXT_PUBLIC_NETWORK);
  }, [recipientAddress, isConnected, address, usdcContractAddress]);

  // If wallet is not connected, show a disabled button
  if (!isConnected || !address) {
    console.log('⚠️ Wallet not connected, showing disabled button');
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
        calls={[{
          // USDC transfer - ALWAYS use USDC
          to: usdcContractAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipientAddress as `0x${string}`, usdcAmount]
          }),
          value: '0', // No ETH value for ERC20 transfer
        }]}
        chainId={84532} // Base Sepolia
        onSuccess={(transactionData) => {
          handleTransactionSuccess(transactionData);
        }}
        onError={handleTransactionError}
      >
        <TransactionButton
          disabled={disabled || loading || isProcessing}
          className={styles.transactionButton}
        >
          {loading || isProcessing 
            ? 'Processing 1 USDC Payment...' 
            : children
          }
        </TransactionButton>
      </Transaction>
    </div>
  );
}
