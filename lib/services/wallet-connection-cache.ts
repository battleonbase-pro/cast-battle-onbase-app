// Wallet connection caching to prevent repeated connection attempts
// Helps with performance issues in mini-app environments

interface CachedConnection {
  address: string;
  timestamp: number;
  connector: string;
  environment: 'farcaster' | 'base' | 'external';
}

interface ConnectionAttempt {
  connector: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

class WalletConnectionCache {
  private static instance: WalletConnectionCache;
  private connections: Map<string, CachedConnection> = new Map();
  private attempts: Map<string, ConnectionAttempt[]> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;
  private readonly ATTEMPT_COOLDOWN = 30 * 1000; // 30 seconds

  private constructor() {}

  static getInstance(): WalletConnectionCache {
    if (!WalletConnectionCache.instance) {
      WalletConnectionCache.instance = new WalletConnectionCache();
    }
    return WalletConnectionCache.instance;
  }

  /**
   * Cache a successful connection
   */
  cacheConnection(address: string, connector: string, environment: 'farcaster' | 'base' | 'external'): void {
    const connection: CachedConnection = {
      address,
      timestamp: Date.now(),
      connector,
      environment
    };

    this.connections.set(address, connection);
    console.log(`🔗 Cached wallet connection: ${address} via ${connector} in ${environment}`);
  }

  /**
   * Get cached connection if still valid
   */
  getCachedConnection(address: string): CachedConnection | null {
    const connection = this.connections.get(address);
    
    if (!connection) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - connection.timestamp > this.CACHE_DURATION) {
      this.connections.delete(address);
      console.log(`🔗 Cached connection expired for ${address}`);
      return null;
    }

    console.log(`🔗 Using cached connection for ${address}`);
    return connection;
  }

  /**
   * Record a connection attempt
   */
  recordAttempt(connector: string, success: boolean, error?: string): void {
    const attempt: ConnectionAttempt = {
      connector,
      timestamp: Date.now(),
      success,
      error
    };

    const attempts = this.attempts.get(connector) || [];
    attempts.push(attempt);
    
    // Keep only recent attempts
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp < this.CACHE_DURATION
    );
    
    this.attempts.set(connector, recentAttempts);
    
    console.log(`🔗 Recorded ${success ? 'successful' : 'failed'} connection attempt for ${connector}`);
  }

  /**
   * Check if we should attempt connection (not too many recent failures)
   */
  shouldAttemptConnection(connector: string): boolean {
    const attempts = this.attempts.get(connector) || [];
    
    // Filter recent attempts
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp < this.ATTEMPT_COOLDOWN
    );

    // Check if we've exceeded max attempts
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      console.log(`🔗 Too many recent attempts for ${connector}, skipping`);
      return false;
    }

    // Check if last attempt was recent and failed
    const lastAttempt = attempts[attempts.length - 1];
    if (lastAttempt && !lastAttempt.success) {
      const timeSinceLastAttempt = Date.now() - lastAttempt.timestamp;
      if (timeSinceLastAttempt < this.ATTEMPT_COOLDOWN) {
        console.log(`🔗 Last attempt for ${connector} was recent and failed, waiting`);
        return false;
      }
    }

    return true;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.connections.clear();
    this.attempts.clear();
    console.log('🔗 Cleared all wallet connection cache');
  }

  /**
   * Clear cache for specific address
   */
  clearAddressCache(address: string): void {
    this.connections.delete(address);
    console.log(`🔗 Cleared cache for address ${address}`);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    totalAttempts: number;
    successfulConnections: number;
    failedConnections: number;
  } {
    const totalConnections = this.connections.size;
    const allAttempts = Array.from(this.attempts.values()).flat();
    const successfulConnections = allAttempts.filter(attempt => attempt.success).length;
    const failedConnections = allAttempts.filter(attempt => !attempt.success).length;

    return {
      totalConnections,
      totalAttempts: allAttempts.length,
      successfulConnections,
      failedConnections
    };
  }
}

// Singleton instance
export const walletConnectionCache = WalletConnectionCache.getInstance();

// Export the class for testing
export { WalletConnectionCache };
