/**
 * Worker Service Client
 * Helper functions for communicating with the Battle Completion Worker
 */

const WORKER_API_KEY = process.env.WORKER_API_KEY || '92d4cca6-2987-417c-b6bf-36ac4cba6972';
const WORKER_BASE_URL = process.env.WORKER_BASE_URL || 'https://battle-completion-worker-733567590021.us-central1.run.app';

interface WorkerStatus {
  isRunning: boolean;
  battleManagerInitialized: boolean;
  lastSuccessfulCheck: string | null;
  retryCount: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

interface BattleManagerStatus {
  success: boolean;
  status: string;
  config: {
    battleDurationHours: number;
    maxParticipants: number;
  };
  currentBattle: {
    id: string;
    status: string;
    participants: number;
    endTime: string;
  } | null;
}

class WorkerServiceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = WORKER_BASE_URL, apiKey: string = WORKER_API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker service error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Get worker health status (no API key required)
   */
  async getHealth(): Promise<WorkerStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Get battle manager status
   */
  async getStatus(): Promise<BattleManagerStatus> {
    return this.makeRequest('/status');
  }


  /**
   * Trigger manual battle check
   */
  async triggerCheck(): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/trigger', 'POST');
  }

  /**
   * Check if worker is healthy and accessible
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.isRunning && health.battleManagerInitialized;
    } catch (error) {
      console.error('Worker health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const workerClient = new WorkerServiceClient();

// Export class for custom instances
export { WorkerServiceClient };

// Export types
export type { WorkerStatus, BattleManagerStatus };
