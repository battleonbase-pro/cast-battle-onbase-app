"use client";
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { Transaction, LifecycleStatus, TransactionResponseType } from '@coinbase/onchainkit/transaction';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useConnect, useBalance } from 'wagmi';
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
  onClick: _onClick,
  onSuccess,
  disabled = false,
  loading = false,
  children: _children,
  amount,
  recipientAddress
}: BasePaymentButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: gasBalance } = useBalance({ address });
  const hasProcessedSuccessRef = useRef(false);

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
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'decimals',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'symbol',
          inputs: [],
          outputs: [{ name: '', type: 'string' }],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'transferFrom',
          inputs: [
            { name: 'from', type: 'address' },
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
        },
        {
          type: 'function',
          name: 'allowance',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        },
        {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ],
        },
        {
          type: 'event',
          name: 'Approval',
          inputs: [
            { name: 'owner', type: 'address', indexed: true },
            { name: 'spender', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false }
          ],
        }
      ] as const,
      functionName: 'transfer',
      args: [recipientAddress as `0x${string}`, parseUnits(amount, 6)]
    }
  ], [USDC_CONTRACT_ADDRESS, recipientAddress, amount]);

  const handleTransactionStatus = useCallback((lifecycleStatus: LifecycleStatus) => {
    // Only log non-success statuses to prevent infinite logs
    if (lifecycleStatus?.statusName !== 'success') {
      console.log('🔍 Transaction status:', lifecycleStatus);
      
      // Reset the success flag when a new transaction starts
      if (lifecycleStatus?.statusName === 'init') {
        hasProcessedSuccessRef.current = false;
      }
    }
    
    if (lifecycleStatus?.statusName === 'error') {
      console.error('❌ Transaction failed:', lifecycleStatus.statusData);
      // Reset on error so user can retry
      hasProcessedSuccessRef.current = false;
    }
  }, []);

  const handleTransactionSuccess = useCallback((response: TransactionResponseType) => {
    // Guard: Only process success once
    if (hasProcessedSuccessRef.current) {
      return;
    }
    
    console.log('🎉 Transaction completed successfully:', response);
    
    // Extract transaction hash from the first receipt
    const transactionHash = response.transactionReceipts[0]?.transactionHash;
    
    if (transactionHash) {
      console.log('📝 Transaction hash:', transactionHash);
      hasProcessedSuccessRef.current = true;
      onSuccess?.(transactionHash); // Pass the transaction hash to the callback
    }
  }, [onSuccess]);

  const handleTransactionError = (error: unknown) => {
    console.error('❌ Transaction error:', error);
    if (error instanceof Error) {
      console.error('❌ Transaction error details:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.name,
        errorCode: (error as { code?: string }).code,
        fullError: JSON.stringify(error, null, 2)
      });
    }
    // You could add error handling here if needed
  };

  // Debug logging
  useEffect(() => {
    console.log('🔧 BasePaymentButton Configuration:', {
      USDC_CONTRACT_ADDRESS,
      recipientAddress,
      amount,
      isConnected,
      address,
      parsedAmount: parseUnits(amount, 6).toString(),
      gasBalance: gasBalance ? formatUnits(gasBalance.value, 18) : 'N/A',
      gasBalanceWei: gasBalance?.value.toString(),
      callsCount: calls.length,
      callsPreview: calls.map(call => ({
        address: call.address,
        functionName: call.functionName,
        args: call.args?.map(arg => typeof arg === 'bigint' ? arg.toString() : arg)
      }))
    });
    
    // Warn if gas balance is low
    if (gasBalance && gasBalance.value < parseUnits('0.0001', 18)) {
      console.warn('⚠️ Low gas balance detected. Ensure you have enough ETH for transaction fees.');
      console.warn('⚠️ Current gas balance:', formatUnits(gasBalance.value, 18), 'ETH');
    }
  }, [USDC_CONTRACT_ADDRESS, recipientAddress, amount, isConnected, address, calls, gasBalance]);

  // If wallet is not connected, show connect message
  if (!isConnected || !address) {
    console.log('⚠️ BasePaymentButton: Wallet not connected or no address available');
    
    const handleConnectWallet = async () => {
      try {
        console.log('🔗 BasePaymentButton: Attempting to connect wallet...');
        
        // Find the most appropriate connector for external environments
        const coinbaseConnector = connectors.find(c => c.id === 'coinbaseWallet');
        const injectedConnector = connectors.find(c => c.id === 'injected');
        
        const selectedConnector = coinbaseConnector || injectedConnector;
        
        if (selectedConnector) {
          console.log('🔗 Connecting with connector:', selectedConnector.id);
          await connect({ connector: selectedConnector });
        } else {
          console.log('⚠️ No suitable connector found');
          // Fallback: refresh page to trigger connection flow
          window.location.reload();
        }
      } catch (error) {
        console.error('❌ Wallet connection failed:', error);
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
          Connect Wallet to Pay
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
