/**
 * Worker Client Service
 * Handles communication with the battle completion worker service
 */

interface WorkerResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class WorkerClient {
  private workerUrl: string;
  private apiKey: string;

  constructor() {
    // Use the correct worker URL from the deployed service
    this.workerUrl = process.env.WORKER_URL || 'https://battle-completion-worker-3lducklitq-uc.a.run.app';
    this.apiKey = process.env.WORKER_API_KEY || '92d4cca6-2987-417c-b6bf-36ac4cba6972';
  }

  /**
   * Trigger a check on the worker service
   */
  async triggerCheck(): Promise<WorkerResponse> {
    try {
      console.log(`🔄 Triggering worker check at ${this.workerUrl}/trigger`);
      
      const response = await fetch(`${this.workerUrl}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Worker service responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Worker service response:`, result);
      
      return {
        success: true,
        message: result.message || 'Worker check completed successfully',
      };
    } catch (error) {
      console.error(`❌ Worker service error:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get worker status
   */
  async getStatus(): Promise<WorkerResponse> {
    try {
      console.log(`📊 Getting worker status from ${this.workerUrl}/status`);
      
      const response = await fetch(`${this.workerUrl}/status`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Worker service responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`📊 Worker status:`, result);
      
      return {
        success: true,
        message: JSON.stringify(result),
      };
    } catch (error) {
      console.error(`❌ Worker status error:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Initialize the worker service
   */
  async initialize(): Promise<WorkerResponse> {
    try {
      console.log(`🚀 Initializing worker service at ${this.workerUrl}/init`);
      
      const response = await fetch(`${this.workerUrl}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Worker service responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Worker initialization response:`, result);
      
      return {
        success: true,
        message: result.message || 'Worker initialized successfully',
      };
    } catch (error) {
      console.error(`❌ Worker initialization error:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }
}

// Export singleton instance
export const workerClient = new WorkerClient();
