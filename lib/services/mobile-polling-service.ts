// Enhanced mobile polling service with visibility API support
// Prevents polling when app is in background to reduce CPU usage

interface PollingData {
  battleData?: any;
  userPoints?: number;
  leaderboard?: any[];
  battleHistory?: any[];
  casts?: any[];
  sentimentData?: any;
  timerData?: any;
}

interface PollingCallbacks {
  onBattleData?: (data: any) => void;
  onUserPoints?: (points: number) => void;
  onLeaderboard?: (leaderboard: any[]) => void;
  onBattleHistory?: (history: any[]) => void;
  onCasts?: (casts: any[]) => void;
  onSentimentData?: (data: any) => void;
  onTimerData?: (data: any) => void;
  onError?: (error: string) => void;
}

class MobilePollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private userAddress: string | null = null;
  private callbacks: PollingCallbacks = {};
  private pollingInterval: number = 30000; // 30 seconds
  private isVisible = true; // Track visibility state
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    this.pollingInterval = 30000; // Default 30 seconds for mobile
    this.setupVisibilityListener();
  }

  /**
   * Set up visibility change listener to pause/resume polling
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    this.visibilityChangeHandler = () => {
      const wasVisible = this.isVisible;
      this.isVisible = !document.hidden;
      
      console.log(`📱 App visibility changed: ${this.isVisible ? 'visible' : 'hidden'}`);
      
      // If app became visible and we were polling, resume immediately
      if (this.isVisible && wasVisible === false && this.isPolling) {
        console.log('📱 App became visible, resuming polling immediately');
        this.pollData();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Start polling for data
   */
  startPolling(userAddress: string, callbacks: PollingCallbacks): void {
    if (this.isPolling) {
      console.log('📱 Polling already active, skipping start');
      return;
    }

    this.userAddress = userAddress;
    this.callbacks = callbacks;
    this.isPolling = true;

    console.log('📱 Starting mobile polling service with 30s interval');
    
    // Start immediate poll
    this.pollData();
    
    // Set up interval polling
    this.intervalId = setInterval(() => {
      // Only poll if app is visible
      if (this.isVisible) {
        this.pollData();
      } else {
        console.log('📱 Skipping poll - app is in background');
      }
    }, this.pollingInterval);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log('📱 Mobile polling service stopped');
  }

  /**
   * Clean up visibility listener
   */
  cleanup(): void {
    this.stopPolling();
    
    if (this.visibilityChangeHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
  }

  /**
   * Poll for all data
   */
  private async pollData(): Promise<void> {
    if (!this.userAddress) {
      console.log('📱 No user address, skipping poll');
      return;
    }

    try {
      console.log('📱 Polling data for mobile mini-app...');
      
      // Poll all data in parallel
      const [
        battleData,
        userPoints,
        leaderboard,
        battleHistory,
        casts
      ] = await Promise.allSettled([
        this.fetchBattleData(),
        this.fetchUserPoints(),
        this.fetchLeaderboard(),
        this.fetchBattleHistory(),
        this.fetchCasts()
      ]);

      // Handle battle data
      if (battleData.status === 'fulfilled' && battleData.value) {
        this.callbacks.onBattleData?.(battleData.value);
      }

      // Handle user points
      if (userPoints.status === 'fulfilled' && userPoints.value !== undefined) {
        this.callbacks.onUserPoints?.(userPoints.value);
      }

      // Handle leaderboard
      if (leaderboard.status === 'fulfilled' && leaderboard.value) {
        this.callbacks.onLeaderboard?.(leaderboard.value);
      }

      // Handle battle history
      if (battleHistory.status === 'fulfilled' && battleHistory.value) {
        this.callbacks.onBattleHistory?.(battleHistory.value);
      }

      // Handle casts
      if (casts.status === 'fulfilled' && casts.value) {
        this.callbacks.onCasts?.(casts.value);
      }

      // Log any errors
      const errors = [battleData, userPoints, leaderboard, battleHistory, casts]
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);

      if (errors.length > 0) {
        console.warn('📱 Some polling requests failed:', errors);
      }

    } catch (error) {
      console.error('📱 Polling error:', error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Polling failed');
    }
  }

  /**
   * Fetch current battle data
   */
  private async fetchBattleData(): Promise<any> {
    const response = await fetch('/api/battle/current');
    const data = await response.json();
    return data.success ? data.battle : null;
  }

  /**
   * Fetch user points with enhanced error handling
   */
  private async fetchUserPoints(): Promise<number> {
    if (!this.userAddress) return 0;
    
    try {
      const response = await fetch(`/api/user/points?address=${this.userAddress}`);
      
      if (!response.ok) {
        console.warn(`📱 User points API returned ${response.status}: ${response.statusText}`);
        return 0;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.warn('📱 User points API returned error:', data.error);
        return 0;
      }
      
      console.log(`📱 Fetched user points: ${data.points} for ${this.userAddress}`);
      return data.points;
    } catch (error) {
      console.error('📱 Error fetching user points:', error);
      return 0;
    }
  }

  /**
   * Fetch leaderboard
   */
  private async fetchLeaderboard(): Promise<any[]> {
    const response = await fetch('/api/user/leaderboard?limit=10');
    const data = await response.json();
    return data.success ? data.leaderboard : [];
  }

  /**
   * Fetch battle history
   */
  private async fetchBattleHistory(): Promise<any[]> {
    const response = await fetch('/api/battle/history');
    const data = await response.json();
    return data.success ? data.battles : [];
  }

  /**
   * Fetch casts
   */
  private async fetchCasts(): Promise<any[]> {
    if (!this.userAddress) return [];
    
    const response = await fetch(`/api/battle/current?userAddress=${this.userAddress}`);
    const data = await response.json();
    return data.success && data.battle ? data.battle.casts || [] : [];
  }

  /**
   * Check if polling is active
   */
  isActive(): boolean {
    return this.isPolling;
  }

  /**
   * Update user address
   */
  updateUserAddress(userAddress: string): void {
    this.userAddress = userAddress;
  }

  /**
   * Get polling status for debugging
   */
  getStatus(): {
    isPolling: boolean;
    isVisible: boolean;
    userAddress: string | null;
    interval: number;
  } {
    return {
      isPolling: this.isPolling,
      isVisible: this.isVisible,
      userAddress: this.userAddress,
      interval: this.pollingInterval
    };
  }
}

// Singleton instance
export const mobilePollingService = new MobilePollingService();

// Export the class for testing
export { MobilePollingService };