/**
 * Base Account Capabilities Service
 * Implements proper Base Account capabilities detection as per Base documentation
 */

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';

export interface BaseAccountCapabilities {
  atomicBatch: boolean;
  paymasterService: boolean;
  auxiliaryFunds: boolean;
}

export interface CapabilityDetectionResult {
  capabilities: BaseAccountCapabilities;
  isBaseAccount: boolean;
  error?: string;
}

export class BaseAccountCapabilitiesService {
  private static instance: BaseAccountCapabilitiesService;
  
  public static getInstance(): BaseAccountCapabilitiesService {
    if (!BaseAccountCapabilitiesService.instance) {
      BaseAccountCapabilitiesService.instance = new BaseAccountCapabilitiesService();
    }
    return BaseAccountCapabilitiesService.instance;
  }

  /**
   * Detect Base Account capabilities using wallet_getCapabilities
   * Based on Base documentation: https://docs.base.org/mini-apps/core-concepts/base-account
   */
  async detectCapabilities(address: string, publicClient: any): Promise<CapabilityDetectionResult> {
    try {
      console.log('🔍 Detecting Base Account capabilities for address:', address);
      
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // Use wallet_getCapabilities as per Base documentation
      const caps = await publicClient.request({
        method: 'wallet_getCapabilities',
        params: [address]
      });

      console.log('📊 Raw capabilities response:', caps);

      // Extract capabilities for Base Sepolia (chain ID: 84532)
      const chainCapabilities = caps['84532'] || caps['0x14A34'] || {};
      
      const capabilities: BaseAccountCapabilities = {
        atomicBatch: chainCapabilities['atomicBatch']?.supported || false,
        paymasterService: chainCapabilities['paymasterService']?.supported || false,
        auxiliaryFunds: chainCapabilities['auxiliaryFunds']?.supported || false
      };

      const isBaseAccount = capabilities.atomicBatch || capabilities.paymasterService || capabilities.auxiliaryFunds;

      console.log('✅ Base Account capabilities detected:', {
        capabilities,
        isBaseAccount
      });

      return {
        capabilities,
        isBaseAccount
      };

    } catch (error) {
      console.log('⚠️ Base Account capabilities detection failed:', error);
      
      return {
        capabilities: {
          atomicBatch: false,
          paymasterService: false,
          auxiliaryFunds: false
        },
        isBaseAccount: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if the current environment is a Base mini app
   */
  isBaseMiniAppEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const hasBaseUserAgent = userAgent.includes('base') || userAgent.includes('coinbase');
    
    // Check for Base-specific global objects
    const hasBaseEthereum = !!(window as any).ethereum?.isBase;
    
    return hasBaseUserAgent || hasBaseEthereum;
  }

  /**
   * Get paymaster service configuration for sponsored transactions
   * Based on Base documentation example
   */
  getPaymasterServiceConfig(): { paymasterService: { url: string } } | {} {
    // This should be configured based on your Base Account setup
    // For now, return empty object - this would need to be configured
    // with your actual paymaster service URL
    return {};
  }

  /**
   * Create capabilities object for writeContracts
   * Based on Base documentation example
   */
  createCapabilitiesForTransaction(capabilities: BaseAccountCapabilities): any {
    if (!capabilities.paymasterService) {
      return {};
    }

    // Return paymaster service configuration
    // This would need to be configured with your actual paymaster service URL
    return this.getPaymasterServiceConfig();
  }
}

export const baseAccountCapabilitiesService = BaseAccountCapabilitiesService.getInstance();

/**
 * React hook for Base Account capabilities
 * Based on Base documentation example
 */
export function useBaseAccountCapabilities(address?: string) {
  const { address: accountAddress } = useAccount();
  const publicClient = usePublicClient();
  
  const [capabilities, setCapabilities] = useState<BaseAccountCapabilities>({
    atomicBatch: false,
    paymasterService: false,
    auxiliaryFunds: false
  });
  
  const [isBaseAccount, setIsBaseAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectCapabilities = async () => {
      const targetAddress = address || accountAddress;
      if (!targetAddress || !publicClient) {
        setCapabilities({
          atomicBatch: false,
          paymasterService: false,
          auxiliaryFunds: false
        });
        setIsBaseAccount(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await baseAccountCapabilitiesService.detectCapabilities(targetAddress, publicClient);
        setCapabilities(result.capabilities);
        setIsBaseAccount(result.isBaseAccount);
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCapabilities({
          atomicBatch: false,
          paymasterService: false,
          auxiliaryFunds: false
        });
        setIsBaseAccount(false);
      } finally {
        setLoading(false);
      }
    };

    detectCapabilities();
  }, [address, accountAddress, publicClient]);

  return {
    capabilities,
    isBaseAccount,
    loading,
    error
  };
}
