'use client';

import React, { useState, useEffect } from 'react';
import { getBaseAccountService } from '@/lib/services/base-account-service';
import { getContractService } from '@/lib/services/debate-contract-service';

interface GaslessPaymentProps {
  debateId: number;
  entryFee: string;
  onPaymentSuccess?: (txHash: string) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

export default function GaslessPayment({
  debateId,
  entryFee,
  onPaymentSuccess,
  onPaymentError,
  className = ''
}: GaslessPaymentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [isParticipant, setIsParticipant] = useState(false);
  const [error, setError] = useState<string>('');
  const [isGasless, setIsGasless] = useState(false);

  const baseAccountService = getBaseAccountService();
  const contractService = getContractService();

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (isConnected) {
      checkBalance();
      checkParticipation();
    }
  }, [isConnected, debateId]);

  const checkConnection = async () => {
    try {
      // Check if Base Account SDK is available
      if (baseAccountService.isAvailable()) {
        const isSignedIn = await baseAccountService.isSignedIn();
        if (isSignedIn) {
          const account = await baseAccountService.getBaseAccount();
          setUserAddress(account.address);
          setIsConnected(true);
          setIsGasless(true);
          console.log('✅ Connected via Base Account SDK');
          return;
        }
      }

      // Fallback to regular wallet connection
      const address = await contractService.connect();
      setUserAddress(address);
      setIsConnected(true);
      setIsGasless(false);
      console.log('✅ Connected via regular wallet');
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
    }
  };

  const checkBalance = async () => {
    try {
      if (isGasless) {
        const balance = await baseAccountService.getUSDCBalance();
        setUsdcBalance(balance);
      } else {
        const balanceInfo = await contractService.checkUSDCBalance(entryFee);
        setUsdcBalance(balanceInfo.balance);
      }
    } catch (error) {
      console.error('Failed to check balance:', error);
    }
  };

  const checkParticipation = async () => {
    try {
      if (isGasless) {
        // For gasless, we'll need to implement a different way to check participation
        // For now, we'll assume not participating
        setIsParticipant(false);
      } else {
        const participant = await contractService.isParticipant(debateId);
        setIsParticipant(participant);
      }
    } catch (error) {
      console.error('Failed to check participation:', error);
    }
  };

  const signInWithBase = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { address } = await baseAccountService.signInWithBase();
      setUserAddress(address);
      setIsConnected(true);
      setIsGasless(true);
      
      await checkBalance();
      await checkParticipation();
    } catch (error: any) {
      console.error('Failed to sign in with Base:', error);
      setError(error.message || 'Failed to sign in with Base Account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinDebate = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (isGasless) {
        // Gasless flow
        console.log('⛽ Joining debate with gasless transaction...');
        
        // First approve USDC spending
        const contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
        if (!contractAddress) {
          throw new Error('Contract address not configured');
        }

        console.log('🔐 Approving USDC spending...');
        await baseAccountService.approveUSDCGasless(contractAddress, entryFee);

        console.log('🎯 Joining debate...');
        const txHash = await baseAccountService.joinDebateGasless(debateId);

        console.log('✅ Successfully joined debate with gasless transaction!');
        setIsParticipant(true);
        onPaymentSuccess?.(txHash);
      } else {
        // Regular flow
        console.log('💰 Joining debate with regular transaction...');
        
        // Check balance first
        const balanceInfo = await contractService.checkUSDCBalance(entryFee);
        if (!balanceInfo.hasBalance) {
          throw new Error(`Insufficient USDC balance. Required: ${balanceInfo.required}, Available: ${balanceInfo.balance}`);
        }

        // Approve USDC spending
        console.log('🔐 Approving USDC spending...');
        await contractService.approveUSDC(entryFee);

        // Join debate
        console.log('🎯 Joining debate...');
        const txHash = await contractService.joinDebate(debateId);

        console.log('✅ Successfully joined debate!');
        setIsParticipant(true);
        onPaymentSuccess?.(txHash);
      }
    } catch (error: any) {
      console.error('Failed to join debate:', error);
      const errorMessage = error.message || 'Failed to join debate';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Connect to Join Debate</h3>
          <p className="text-gray-600 text-sm mb-4">
            Choose your preferred connection method:
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={signInWithBase}
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Connecting...
              </div>
            ) : (
              <>
                <span className="mr-2">🔵</span>
                Sign in with Base Account (Gasless)
              </>
            )}
          </button>
          
          <button
            onClick={checkConnection}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            <span className="mr-2">🔗</span>
            Connect Regular Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isParticipant) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">✅ Already Participating</p>
          <p className="text-sm">You are already participating in this debate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`text-center p-4 ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-900 mb-2">Join Debate</h3>
        <p className="text-blue-700 text-sm mb-2">
          Entry Fee: <span className="font-medium">{entryFee} USDC</span>
        </p>
        <p className="text-blue-700 text-sm mb-2">
          Your Balance: <span className="font-medium">{usdcBalance} USDC</span>
        </p>
        {isGasless && (
          <div className="bg-green-100 border border-green-300 rounded p-2 mt-2">
            <p className="text-green-700 text-xs font-medium">
              ⛽ Gasless Transaction Enabled
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleJoinDebate}
        disabled={isLoading || parseFloat(usdcBalance) < parseFloat(entryFee)}
        className={`
          ${parseFloat(usdcBalance) >= parseFloat(entryFee)
            ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
            : 'bg-gray-400 cursor-not-allowed'
          }
          text-white px-6 py-2 rounded-lg font-medium
        `}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            {isGasless ? 'Processing Gasless...' : 'Processing...'}
          </div>
        ) : parseFloat(usdcBalance) >= parseFloat(entryFee) ? (
          `Join Debate (${entryFee} USDC)${isGasless ? ' - Gasless' : ''}`
        ) : (
          'Insufficient USDC Balance'
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p>Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}</p>
        <p>Network: Base Sepolia</p>
        <p>Mode: {isGasless ? 'Gasless (Base Account)' : 'Regular Wallet'}</p>
      </div>
    </div>
  );
}
