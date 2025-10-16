import { createBaseAccountSDK } from '@base-org/account';
import { ethers } from 'ethers';

/**
 * Base Account SDK service for gasless transactions
 */
export class BaseAccountService {
  private sdk: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeSDK();
  }

  /**
   * Initialize Base Account SDK
   */
  private async initializeSDK() {
    try {
      if (typeof window === 'undefined') {
        console.log('⚠️  Base Account SDK: Window not available (SSR)');
        return;
      }

      // Initialize Base Account SDK
      this.sdk = await createBaseAccountSDK({
        // Base Sepolia configuration
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        // Add your app-specific configuration
        appName: 'NewsCast Debate',
        appIcon: '/icon.png',
        appDescription: 'AI-powered news debates on Base blockchain'
      });

      this.isInitialized = true;
      console.log('✅ Base Account SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Base Account SDK:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Base Account SDK is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.sdk !== null;
  }

  /**
   * Get user's Base Account
   */
  async getBaseAccount(): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const account = await this.sdk.getAccount();
      return account;
    } catch (error) {
      console.error('Failed to get Base Account:', error);
      throw error;
    }
  }

  /**
   * Sign in with Base Account
   */
  async signInWithBase(): Promise<{ address: string; account: any }> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      console.log('🔐 Signing in with Base Account...');
      
      const account = await this.sdk.signIn();
      const address = account.address;
      
      console.log('✅ Signed in with Base Account:', address);
      return { address, account };
    } catch (error) {
      console.error('❌ Failed to sign in with Base Account:', error);
      throw error;
    }
  }

  /**
   * Execute gasless transaction
   */
  async executeGaslessTransaction(
    to: string,
    data: string,
    value: string = '0'
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      console.log('⛽ Executing gasless transaction...');
      
      const tx = await this.sdk.executeTransaction({
        to,
        data,
        value,
        // Gasless configuration
        gasless: true
      });

      console.log('✅ Gasless transaction executed:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to execute gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Execute gasless contract call
   */
  async executeGaslessContractCall(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = []
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      console.log(`📞 Executing gasless contract call: ${methodName}`);
      
      const contract = new ethers.Contract(contractAddress, abi, this.sdk.getSigner());
      
      const tx = await contract[methodName](...params, {
        gasless: true
      });

      console.log('✅ Gasless contract call executed:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to execute gasless contract call:', error);
      throw error;
    }
  }

  /**
   * Join debate with gasless transaction
   */
  async joinDebateGasless(debateId: number): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      console.log(`🎯 Joining debate ${debateId} with gasless transaction...`);
      
      const contractAddress = process.env.NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Debate pool contract address not configured');
      }

      // Contract ABI for joinDebate function
      const abi = [
        "function joinDebate(uint256 debateId) external"
      ];

      const txHash = await this.executeGaslessContractCall(
        contractAddress,
        abi,
        'joinDebate',
        [debateId]
      );

      console.log('✅ Joined debate with gasless transaction:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to join debate with gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Approve USDC with gasless transaction
   */
  async approveUSDCGasless(
    spender: string,
    amount: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      console.log(`🔐 Approving USDC with gasless transaction...`);
      
      const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
      const amountWei = ethers.parseUnits(amount, 6);

      // USDC ABI for approve function
      const abi = [
        "function approve(address spender, uint256 amount) external returns (bool)"
      ];

      const txHash = await this.executeGaslessContractCall(
        usdcAddress,
        abi,
        'approve',
        [spender, amountWei]
      );

      console.log('✅ USDC approved with gasless transaction:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to approve USDC with gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const account = await this.getBaseAccount();
      const balance = await account.getBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get account balance:', error);
      throw error;
    }
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Base Account SDK not available');
    }

    try {
      const account = await this.getBaseAccount();
      const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
      
      // USDC ABI for balanceOf function
      const abi = [
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)"
      ];

      const contract = new ethers.Contract(usdcAddress, abi, account.getSigner());
      const balance = await contract.balanceOf(account.address);
      
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      throw error;
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const account = await this.getBaseAccount();
      return account && account.address;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sign out from Base Account
   */
  async signOut(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.sdk.signOut();
      console.log('✅ Signed out from Base Account');
    } catch (error) {
      console.error('❌ Failed to sign out:', error);
    }
  }
}

/**
 * Create a singleton instance
 */
let baseAccountService: BaseAccountService | null = null;

export function getBaseAccountService(): BaseAccountService {
  if (!baseAccountService) {
    baseAccountService = new BaseAccountService();
  }
  return baseAccountService;
}
