"use client";
import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { parseUnits } from 'viem';
import styles from './FarcasterPaymentButton.module.css';

interface FarcasterPaymentButtonProps {
  onClick: () => void;
  onSuccess?: (transactionId?: string) => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  amount: string;
  recipientAddress: string;
}

export default function FarcasterPaymentButton({
  onClick,
  onSuccess,
  disabled = false,
  loading = false,
  children,
  amount,
  recipientAddress
}: FarcasterPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // USDC contract address on Base Sepolia
  const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

  const handleFarcasterPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Check if we're in a Farcaster Mini App
      const inMiniApp = await sdk.isInMiniApp();
      if (!inMiniApp) {
        throw new Error('Not in Farcaster Mini App environment');
      }

      // Get Farcaster's native Ethereum provider
      console.log('🔍 SDK wallet object:', sdk.wallet);
      console.log('🔍 Available wallet methods:', Object.keys(sdk.wallet || {}));
      
      let ethProvider;
      try {
        // Try the primary method
        ethProvider = await sdk.wallet.getEthereumProvider();
        console.log('🔍 Ethereum provider (getEthereumProvider):', ethProvider);
      } catch (error) {
        console.log('⚠️ getEthereumProvider failed, trying ethProvider property:', error);
        try {
          // Try accessing ethProvider as a property (not a function)
          ethProvider = sdk.wallet.ethProvider;
          console.log('🔍 Ethereum provider (ethProvider property):', ethProvider);
        } catch (fallbackError) {
          console.log('❌ Both methods failed:', fallbackError);
          throw new Error('Failed to get Farcaster Ethereum provider from both methods');
        }
      }
      
      console.log('🔍 Provider type:', typeof ethProvider);
      
      if (!ethProvider) {
        throw new Error('Failed to get Farcaster Ethereum provider');
      }
      
      if (typeof ethProvider.request !== 'function') {
        throw new Error('Ethereum provider does not have request method');
      }

      // Prepare USDC transfer transaction
      const usdcAmount = parseUnits(amount, 6); // USDC has 6 decimals
      const transferData = `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${usdcAmount.toString(16).padStart(64, '0')}`;

      const transactionParams = {
        to: USDC_CONTRACT_ADDRESS,
        data: transferData,
        value: '0x0',
        gas: '0x7530', // 30000 gas limit for ERC20 transfer
      };

      console.log('🚀 Initiating Farcaster payment transaction:', transactionParams);

      // Send transaction through Farcaster wallet
      const txHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [transactionParams],
      });

      console.log('✅ Farcaster payment transaction sent:', txHash);

      // Wait for transaction confirmation
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        receipt = await ethProvider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        attempts++;
      }

      if (receipt && receipt.status === '0x1') {
        console.log('✅ Farcaster payment transaction confirmed:', receipt);
        // Call onSuccess with transaction hash
        if (onSuccess) {
          onSuccess(txHash);
        }
        onClick(); // Call the original onClick handler
      } else {
        throw new Error('Transaction failed or timed out');
      }
    } catch (error) {
      console.error('❌ Farcaster payment failed:', error);
      setError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.paymentButtonContainer}>
      <button
        onClick={handleFarcasterPayment}
        disabled={disabled || loading || isProcessing}
        className={styles.paymentButton}
      >
        {loading || isProcessing ? 'Processing Payment...' : children}
      </button>
      
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <span className={styles.errorText}>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            className={styles.dismissButton}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
