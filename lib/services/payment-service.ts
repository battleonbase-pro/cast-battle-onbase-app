"use client";
import { useState } from 'react';
import { useAccount, useSendTransaction, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { environmentDetector } from '../lib/utils/environment-detector';
import { farcasterPaymentService } from '../lib/services/farcaster-payment-service';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class PaymentService {
  private static instance: PaymentService;
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async processPayment({
    amount = '1.00',
    recipientAddress = '0x6D00f9F5C6a57B46bFa26E032D60B525A1DAe271',
    onTransactionHash,
    onError
  }: {
    amount?: string;
    recipientAddress?: string;
    onTransactionHash?: (hash: string) => void;
    onError?: (error: string) => void;
  }): Promise<PaymentResult> {
    try {
      // Detect environment
      const envInfo = await environmentDetector.detectEnvironment();
      console.log('🔍 Payment environment detected:', envInfo.environment);

      if (envInfo.environment === 'farcaster') {
        // Use Farcaster native payment
        console.log('🔗 Processing Farcaster native payment...');
        
        const result = await farcasterPaymentService.sendUSDCPayment({
          amount,
          recipientAddress,
          onTransactionHash: (hash) => {
            console.log('✅ Farcaster payment transaction hash:', hash);
            onTransactionHash?.(hash);
          },
          onError: (error) => {
            console.error('❌ Farcaster payment error:', error);
            onError?.(error);
          }
        });

        if (result.success) {
          console.log('✅ Farcaster native payment successful');
          return {
            success: true,
            transactionId: result.transactionHash
          };
        } else {
          throw new Error(result.error || 'Farcaster payment failed');
        }
      } else {
        // Use Base Pay for Base mini app or external browsers
        console.log('🔵 Processing Base Pay payment...');
        
        // Import Base Pay SDK dynamically
        const { pay, getPaymentStatus } = await import('@base-org/account');
        
        // Get contract address from environment
        const contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
        if (!contractAddress) {
          throw new Error('Contract address not configured');
        }
        
        // Determine if we're on testnet
        const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || 
                         process.env.NODE_ENV === 'development';
        
        console.log('🔧 Base Pay Configuration:');
        console.log(`   Amount: ${amount} USDC`);
        console.log(`   To: ${contractAddress}`);
        console.log(`   Testnet: ${isTestnet}`);
        
        // Trigger Base Pay
        const payment = await pay({
          amount,
          to: contractAddress as `0x${string}`,
          testnet: isTestnet
        });
        
        console.log('✅ Base Pay initiated:', payment.id);
        
        // Poll for payment status until completed
        let paymentCompleted = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max
        
        while (!paymentCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
          
          try {
            const status = await getPaymentStatus({
              id: payment.id,
              testnet: isTestnet
            });
            
            console.log(`🔍 Payment status check ${attempts}:`, status);
            
            if (status.status === 'completed') {
              console.log('✅ Payment completed successfully');
              paymentCompleted = true;
              return {
                success: true,
                transactionId: payment.id
              };
            } else if (status.status === 'failed' || status.status === 'cancelled') {
              throw new Error(`Payment ${status.status}: ${status.error || 'Unknown error'}`);
            }
          } catch (statusError) {
            console.error('❌ Error checking payment status:', statusError);
            if (attempts >= maxAttempts) {
              throw new Error('Payment status check timeout');
            }
          }
        }
        
        throw new Error('Payment timeout - please try again');
      }
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onError?.(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

export const paymentService = PaymentService.getInstance();
