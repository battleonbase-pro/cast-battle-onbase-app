/**
 * Farcaster Native Payment Service
 * Handles payments using Farcaster's native wallet provider
 */

import { parseUnits } from 'viem';

export interface FarcasterPaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface FarcasterPaymentOptions {
  amount: string; // Amount in USDC (e.g., "1.00")
  recipientAddress: string;
  onTransactionHash?: (hash: string) => void;
  onError?: (error: string) => void;
}

export class FarcasterPaymentService {
  private static instance: FarcasterPaymentService;
  private sdk: any = null;

  static getInstance(): FarcasterPaymentService {
    if (!FarcasterPaymentService.instance) {
      FarcasterPaymentService.instance = new FarcasterPaymentService();
    }
    return FarcasterPaymentService.instance;
  }

  /**
   * Initialize the Farcaster SDK
   */
  private async initializeSDK(): Promise<void> {
    if (this.sdk) return;
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      this.sdk = sdk;
      console.log('✅ Farcaster SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Farcaster SDK:', error);
      throw new Error('Farcaster SDK not available');
    }
  }

  /**
   * Check if we're in a Farcaster Mini App environment
   */
  async isInFarcasterEnvironment(): Promise<boolean> {
    try {
      await this.initializeSDK();
      return await this.sdk.isInMiniApp();
    } catch {
      return false;
    }
  }

  /**
   * Get the Ethereum provider from Farcaster SDK
   */
  async getEthereumProvider(): Promise<any> {
    await this.initializeSDK();
    
    if (!this.sdk.wallet?.getEthereumProvider) {
      throw new Error('Farcaster Ethereum provider not available');
    }
    
    return await this.sdk.wallet.getEthereumProvider();
  }

  /**
   * Send a USDC payment using Farcaster's native wallet
   */
  async sendUSDCPayment(options: FarcasterPaymentOptions): Promise<FarcasterPaymentResult> {
    try {
      console.log('🔗 Starting Farcaster native USDC payment...');
      
      // Initialize SDK
      await this.initializeSDK();
      
      // Check if we're in Farcaster environment
      const isInFarcaster = await this.sdk.isInMiniApp();
      if (!isInFarcaster) {
        throw new Error('Not in Farcaster Mini App environment');
      }

      // Get Ethereum provider
      const provider = await this.getEthereumProvider();
      
      // USDC contract address on Base Sepolia
      const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      // Parse amount (USDC has 6 decimals)
      const amountWei = parseUnits(options.amount, 6);
      
      // Create transaction data for USDC transfer
      const transactionData = {
        to: usdcAddress,
        data: `0xa9059cbb${options.recipientAddress.slice(2).padStart(64, '0')}${amountWei.toString(16).padStart(64, '0')}`,
        value: '0x0' // No ETH value for token transfer
      };

      console.log('📝 Farcaster payment transaction data:', transactionData);

      // Send transaction using Farcaster's native provider
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });

      console.log('✅ Farcaster payment transaction submitted:', hash);
      
      // Wait for transaction confirmation
      console.log('⏳ Waiting for transaction confirmation...');
      
      // Poll for transaction receipt
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
        
        try {
          const receipt = await provider.request({
            method: 'eth_getTransactionReceipt',
            params: [hash]
          });
          
          if (receipt && receipt.status === '0x1') {
            console.log('✅ Farcaster payment transaction confirmed');
            confirmed = true;
          } else if (receipt && receipt.status === '0x0') {
            throw new Error('Transaction failed');
          }
        } catch (receiptError) {
          console.log(`🔍 Transaction confirmation check ${attempts}/${maxAttempts}...`);
          if (attempts >= maxAttempts) {
            throw new Error('Transaction confirmation timeout');
          }
        }
      }
      
      if (!confirmed) {
        throw new Error('Transaction confirmation timeout');
      }
      
      // Call success callback
      if (options.onTransactionHash) {
        options.onTransactionHash(hash);
      }

      return {
        success: true,
        transactionHash: hash
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Farcaster native payment failed:', err);
      
      // Call error callback
      if (options.onError) {
        options.onError(err.message);
      }

      return {
        success: false,
        error: err.message || 'Farcaster payment failed'
      };
    }
  }

  /**
   * Get user's wallet address from Farcaster
   */
  async getUserAddress(): Promise<string | null> {
    try {
      await this.initializeSDK();
      const provider = await this.getEthereumProvider();
      
      const accounts = await provider.request({
        method: 'eth_accounts'
      });
      
      return accounts?.[0] || null;
    } catch (error) {
      console.error('❌ Failed to get Farcaster user address:', error);
      return null;
    }
  }

  /**
   * Check if user's wallet is connected
   */
  async isWalletConnected(): Promise<boolean> {
    try {
      const address = await this.getUserAddress();
      return address !== null;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const farcasterPaymentService = FarcasterPaymentService.getInstance();
