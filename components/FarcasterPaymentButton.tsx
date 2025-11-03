"use client";
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { Transaction, LifecycleStatus, TransactionResponseType } from '@coinbase/onchainkit/transaction';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useConnect, useBalance } from 'wagmi';
import styles from './BasePaymentButton.module.css';

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
  onClick: _onClick,
  onSuccess,
  disabled = false,
  loading = false,
  children: _children,
  amount,
  recipientAddress
}: FarcasterPaymentButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: gasBalance } = useBalance({ address });
  const hasProcessedSuccessRef = useRef(false);

  // USDC contract address on Base Sepolia
  const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

  // USDC ABI for ERC20 transfer
  const usdcAbi = useMemo(() => [
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
    {
      type: 'function',
      name: 'approve',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
    }
  ] as const, []);

  // Prepare USDC transfer call to debate pool
  // Direct transfer: User sends 1 USDC to the debate pool address
  const calls = useMemo(() => [
    {
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: usdcAbi,
      functionName: 'transfer',
      args: [recipientAddress as `0x${string}`, parseUnits(amount, 6)]
    }
  ], [USDC_CONTRACT_ADDRESS, recipientAddress, amount, usdcAbi]);

  const handleTransactionStatus = useCallback((lifecycleStatus: LifecycleStatus) => {
    // Log all statuses for debugging
    console.log('📊 [Farcaster] Transaction status:', {
      statusName: lifecycleStatus?.statusName,
      statusData: lifecycleStatus?.statusData,
      fullStatus: JSON.stringify(lifecycleStatus, null, 2)
    });
    
    // Reset the success flag when a new transaction starts
    if (lifecycleStatus?.statusName === 'init') {
      hasProcessedSuccessRef.current = false;
      return; // Don't log 'init' status to prevent infinite logs
    }
    
    // Only log important statuses
    if (lifecycleStatus?.statusName === 'buildingTransaction') {
      console.log('🔧 [Farcaster] Building transaction...');
    } else if (lifecycleStatus?.statusName === 'transactionPending') {
      console.log('⏳ [Farcaster] Transaction pending...');
    } else if (lifecycleStatus?.statusName === 'error') {
      console.error('❌ [Farcaster] Transaction failed:', lifecycleStatus.statusData);
      hasProcessedSuccessRef.current = false;
    }
  }, []);

  const handleTransactionSuccess = useCallback((response: TransactionResponseType) => {
    // Guard: Only process success once
    if (hasProcessedSuccessRef.current) {
      return;
    }
    
    console.log('🎉 [Farcaster] Transaction completed successfully:', response);
    
    // Extract transaction hash from the first receipt
    const transactionHash = response.transactionReceipts[0]?.transactionHash;
    
    if (transactionHash) {
      console.log('📝 [Farcaster] Transaction hash:', transactionHash);
      hasProcessedSuccessRef.current = true;
      onSuccess?.(transactionHash); // Pass the transaction hash to the callback
    }
  }, [onSuccess]);

  const handleTransactionError = (error: unknown) => {
    console.error('❌ [Farcaster] Transaction error:', error);
    if (error instanceof Error) {
      console.error('❌ [Farcaster] Transaction error details:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.name,
        errorCode: (error as { code?: string }).code,
        fullError: JSON.stringify(error, null, 2)
      });
    }
  };

  // Auto-connect to Farcaster Mini App connector if not connected
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
      console.log('🔍 [Farcaster] Connectors available:', connectors.map(c => ({ id: c.id, name: c.name })));
      console.log('🔍 [Farcaster] Farcaster connector found:', !!farcasterConnector);
      
      if (farcasterConnector) {
        console.log('🔗 [Farcaster] Auto-connecting to Farcaster Mini App connector:', farcasterConnector.id);
        connect({ connector: farcasterConnector })
          .then(() => {
            console.log('✅ [Farcaster] Auto-connection successful');
          })
          .catch((error) => {
            console.error('❌ [Farcaster] Auto-connection failed:', error);
          });
      } else {
        console.warn('⚠️ [Farcaster] Farcaster Mini App connector not found in connectors list');
      }
    } else if (isConnected) {
      console.log('✅ [Farcaster] Wallet already connected:', address);
    }
  }, [isConnected, connectors, connect, address]);

  // Debug logging - log once on mount only
  useEffect(() => {
    console.log('🔧 [Farcaster] FarcasterPaymentButton mounted');
    console.log('🔍 [Farcaster] Wallet connection state:', {
      isConnected,
      address,
      connectorsCount: connectors.length,
      connectorIds: connectors.map(c => c.id)
    });
    console.log('🔍 [Farcaster] Transaction calls:', JSON.stringify(calls, null, 2));
  }, []); // Empty deps - log only once

  // Separate effect for gas balance warning - only when balance changes
  useEffect(() => {
    if (gasBalance && gasBalance.value < parseUnits('0.0001', 18)) {
      console.warn('⚠️ [Farcaster] Low gas balance:', formatUnits(gasBalance.value, 18), 'ETH');
    }
  }, [gasBalance]);

  // If wallet is not connected, show connect message
  if (!isConnected || !address) {
    console.log('⚠️ [Farcaster] Wallet not connected or no address available');
    
    const handleConnectWallet = async () => {
      try {
        console.log('🔗 [Farcaster] Attempting to connect wallet...');
        
        // Find Farcaster Mini App connector
        const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
        
        if (farcasterConnector) {
          console.log('🔗 [Farcaster] Connecting with Farcaster Mini App connector');
          await connect({ connector: farcasterConnector });
        } else {
          console.log('⚠️ [Farcaster] Farcaster Mini App connector not found');
          // Fallback: refresh page to trigger connection flow
          window.location.reload();
        }
      } catch (error) {
        console.error('❌ [Farcaster] Wallet connection failed:', error);
        // Fallback: refresh page to trigger connection flow
        window.location.reload();
      }
    };
    
    return (
      <div className={styles.paymentButtonContainer}>
        <button
          disabled={false}
          className={styles.transactionButton}
          onClick={handleConnectWallet}
        >
          Connect Farcaster Wallet to Pay
        </button>
      </div>
    );
  }

  return (
    <div className={styles.paymentButtonContainer}>
      <Transaction
        calls={calls} 
        chainId={84532} // Base Sepolia chain ID
        onStatus={handleTransactionStatus}
        onSuccess={handleTransactionSuccess}
        onError={handleTransactionError}
        disabled={disabled || loading}
      />
    </div>
  );
}
