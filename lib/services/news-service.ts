import AgentOrchestrator from '@/lib/agents/agent-orchestrator';

interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  debatePoints: {
    Support: string[];
    Oppose: string[];
  };
}

class NewsService {
  private cache = new Map();
  private agentOrchestrator: AgentOrchestrator;

  constructor() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.agentOrchestrator = new AgentOrchestrator(apiKey);
  }

  async getDailyBattleTopic(): Promise<DebateTopic> {
    try {
      const cacheKey = this.getCacheKey();
      const cached = this.cache.get(cacheKey);
      
      // Return cached topic if it's still valid (within 12-hour window)
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      // Use Agent Orchestrator to generate daily battle topic
      const workflowResult = await this.agentOrchestrator.generateDailyBattleTopic();
      const aiGeneratedTopic = workflowResult.debateTopic;
      
      // Cache the AI-generated topic
      this.cache.set(cacheKey, {
        data: aiGeneratedTopic,
        timestamp: new Date()
      });

      return aiGeneratedTopic;
    } catch (error) {
      console.error('Error fetching daily battle topic with Agent Orchestrator:', error);
      
      // Return fallback topic if AI fails
      return {
        id: `fallback_${Date.now()}`,
        title: "AI Service Temporarily Unavailable",
        description: "We're experiencing technical difficulties. Please try again later.",
        category: "error",
        source: "System",
        debatePoints: {
          Support: ["Technology should be reliable", "Users deserve consistent service"],
          Oppose: ["Technical issues are normal", "Patience is required for innovation"]
        }
      };
    }
  }

  private getCacheKey(): string {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDate = now.toISOString().split('T')[0];
    
    // Determine which 12-hour window we're in
    const window = utcHour < 12 ? 'morning' : 'evening';
    
    return `daily_battle_${utcDate}_${window}`;
  }

  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const cacheTime = new Date(timestamp);
    
    // Check if cache is from the same 12-hour window
    const nowHour = now.getUTCHours();
    const cacheHour = cacheTime.getUTCHours();
    
    const nowWindow = nowHour < 12 ? 'morning' : 'evening';
    const cacheWindow = cacheHour < 12 ? 'morning' : 'evening';
    
    // Same day and same 12-hour window
    return now.toDateString() === cacheTime.toDateString() && nowWindow === cacheWindow;
  }
}

export default new NewsService();
