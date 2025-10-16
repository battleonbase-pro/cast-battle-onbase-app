'use client';

import React, { useState, useEffect } from 'react';
import { getContractService, CONTRACT_ADDRESSES } from '@/lib/services/debate-contract-service';

interface USDCPaymentProps {
  debateId: number;
  entryFee: string;
  onPaymentSuccess?: (txHash: string) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

export default function USDCPayment({
  debateId,
  entryFee,
  onPaymentSuccess,
  onPaymentError,
  className = ''
}: USDCPaymentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [isParticipant, setIsParticipant] = useState(false);
  const [error, setError] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);

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
      const address = await contractService.connect();
      setUserAddress(address);
      setIsConnected(true);
      
      const currentChainId = await contractService.getChainId();
      setChainId(currentChainId);
      
      if (currentChainId !== 84532) { // Base Sepolia
        setError('Please switch to Base Sepolia network');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
    }
  };

  const checkBalance = async () => {
    try {
      const balanceInfo = await contractService.checkUSDCBalance(entryFee);
      setUsdcBalance(balanceInfo.balance);
    } catch (error) {
      console.error('Failed to check balance:', error);
    }
  };

  const checkParticipation = async () => {
    try {
      const participant = await contractService.isParticipant(debateId);
      setIsParticipant(participant);
    } catch (error) {
      console.error('Failed to check participation:', error);
    }
  };

  const switchToBaseSepolia = async () => {
    try {
      setIsLoading(true);
      await contractService.switchToBaseSepolia();
      setError('');
      await checkConnection();
    } catch (error) {
      console.error('Failed to switch network:', error);
      setError('Failed to switch to Base Sepolia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinDebate = async () => {
    try {
      setIsLoading(true);
      setError('');

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
        <button
          onClick={checkConnection}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (chainId !== 84532) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Switch to Base Sepolia</p>
          <p className="text-sm">Please switch to Base Sepolia network to participate in debates.</p>
        </div>
        <button
          onClick={switchToBaseSepolia}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium"
        >
          {isLoading ? 'Switching...' : 'Switch Network'}
        </button>
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
        <p className="text-blue-700 text-sm">
          Your Balance: <span className="font-medium">{usdcBalance} USDC</span>
        </p>
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
            Processing...
          </div>
        ) : parseFloat(usdcBalance) >= parseFloat(entryFee) ? (
          `Join Debate (${entryFee} USDC)`
        ) : (
          'Insufficient USDC Balance'
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p>Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}</p>
        <p>Network: Base Sepolia</p>
      </div>
    </div>
  );
}
