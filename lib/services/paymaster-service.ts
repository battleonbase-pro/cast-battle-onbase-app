import { ethers } from 'ethers';

/**
 * Paymaster service for sponsored gas transactions
 * This service handles gas sponsorship for Base Account transactions
 */
export class PaymasterService {
  private provider: ethers.JsonRpcProvider;
  private paymasterAddress: string;
  private isInitialized = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    this.paymasterAddress = process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS || '';
  }

  /**
   * Initialize the paymaster service
   */
  async initialize(): Promise<void> {
    try {
      if (!this.paymasterAddress) {
        console.log('⚠️  Paymaster address not configured, skipping initialization');
        return;
      }

      // Check if paymaster contract exists
      const code = await this.provider.getCode(this.paymasterAddress);
      if (code === '0x') {
        console.log('⚠️  Paymaster contract not deployed, skipping initialization');
        return;
      }

      this.isInitialized = true;
      console.log('✅ Paymaster service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize paymaster service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if paymaster is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.paymasterAddress !== '';
  }

  /**
   * Get paymaster configuration for a transaction
   */
  async getPaymasterConfig(
    userOp: any,
    entryPoint: string
  ): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Paymaster not available');
    }

    try {
      // This is a simplified implementation
      // In production, you would integrate with a real paymaster service
      return {
        paymasterAndData: this.paymasterAddress,
        verificationGasLimit: 100000,
        preVerificationGas: 21000,
        callGasLimit: 100000
      };
    } catch (error) {
      console.error('Failed to get paymaster config:', error);
      throw error;
    }
  }

  /**
   * Sponsor gas for a transaction
   */
  async sponsorGas(
    to: string,
    data: string,
    value: string = '0'
  ): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Paymaster not available');
    }

    try {
      console.log('⛽ Sponsoring gas for transaction...');
      
      // This is a placeholder implementation
      // In production, you would integrate with a real paymaster service
      const sponsoredTx = {
        to,
        data,
        value,
        gasSponsored: true,
        paymaster: this.paymasterAddress
      };

      console.log('✅ Gas sponsored successfully');
      return sponsoredTx;
    } catch (error) {
      console.error('❌ Failed to sponsor gas:', error);
      throw error;
    }
  }

  /**
   * Check if a transaction is eligible for gas sponsorship
   */
  async isEligibleForSponsorship(
    userAddress: string,
    transactionType: string
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Simple eligibility check
      // In production, you would implement more sophisticated logic
      const eligibleTypes = ['joinDebate', 'approveUSDC'];
      return eligibleTypes.includes(transactionType);
    } catch (error) {
      console.error('Failed to check sponsorship eligibility:', error);
      return false;
    }
  }

  /**
   * Get sponsorship limits for a user
   */
  async getSponsorshipLimits(userAddress: string): Promise<{
    dailyLimit: string;
    usedToday: string;
    remaining: string;
  }> {
    if (!this.isAvailable()) {
      return {
        dailyLimit: '0',
        usedToday: '0',
        remaining: '0'
      };
    }

    try {
      // Placeholder implementation
      // In production, you would query the paymaster contract
      return {
        dailyLimit: '10', // 10 transactions per day
        usedToday: '0',   // Transactions used today
        remaining: '10'   // Remaining transactions
      };
    } catch (error) {
      console.error('Failed to get sponsorship limits:', error);
      return {
        dailyLimit: '0',
        usedToday: '0',
        remaining: '0'
      };
    }
  }
}

/**
 * Create a singleton instance
 */
let paymasterService: PaymasterService | null = null;

export function getPaymasterService(): PaymasterService {
  if (!paymasterService) {
    paymasterService = new PaymasterService();
  }
  return paymasterService;
}

/**
 * Initialize paymaster service
 */
export async function initializePaymaster(): Promise<void> {
  const service = getPaymasterService();
  await service.initialize();
}
