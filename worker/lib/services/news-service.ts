import AgentOrchestrator from '../agents/agent-orchestrator';
import DatabaseService from './database';

interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  articleUrl?: string;
  imageUrl?: string;
  thumbnail?: string;
  debatePoints: {
    Support: string[];
    Oppose: string[];
  };
}

interface SimilarityCacheEntry {
  similarity: number;
  timestamp: number;
  method: 'ai' | 'title';
}

class NewsService {
  private cache = new Map();
  private similarityCache = new Map<string, SimilarityCacheEntry>();
  private agentOrchestrator: AgentOrchestrator;
  private db: typeof DatabaseService;

  constructor() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.agentOrchestrator = new AgentOrchestrator(apiKey);
    this.db = DatabaseService;
  }

  async getDailyBattleTopic(): Promise<DebateTopic> {
    const battleCount = await this.getBattleCountForToday();
    const cacheKey = this.getCacheKey(battleCount);
      const cached = this.cache.get(cacheKey);
      
      // Return cached topic if it's still valid (within 12-hour window)
      if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('[News Service] Returning cached topic:', cached.data.title);
        return cached.data;
      }

    // Try to generate topic with retry logic and similarity checking
    const maxRetries = 3;
    let lastError: Error | null = null;
    let similarityFailures = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[News Service] Attempt ${attempt}/${maxRetries}: Generating daily battle topic...`);
        
        // Use different strategies based on attempt and previous failures
        const workflowResult = await this.generateTopicWithStrategy(attempt, similarityFailures);
      const aiGeneratedTopic = workflowResult.debateTopic;
        const newsArticleTitle = workflowResult.curatedTopic?.title;
        
        // Validate the generated topic
        if (this.validateTopic(aiGeneratedTopic)) {
          // Check similarity against recent battles using NEWS ARTICLE title, not debate topic
          const similarity = await this.checkTopicSimilarity(newsArticleTitle || aiGeneratedTopic.title);
          
          if (similarity < 0.7) { // Threshold for uniqueness
            console.log(`[News Service] ✅ Successfully generated unique news article on attempt ${attempt}:`, newsArticleTitle);
            console.log(`[News Service] ✅ Debate topic:`, aiGeneratedTopic.title);
            console.log(`[News Service] ✅ Similarity score:`, similarity);
      
      // Cache the AI-generated topic
      this.cache.set(cacheKey, {
        data: aiGeneratedTopic,
        timestamp: new Date()
      });

      return aiGeneratedTopic;
          } else {
            similarityFailures++;
            console.log(`[News Service] ⚠️ News article too similar to recent battles (${similarity}), retrying with different strategy...`);
            console.log(`[News Service] ⚠️ Similar article:`, newsArticleTitle);
            
            throw new Error(`News article too similar to recent battles on attempt ${attempt}`);
          }
        } else {
          throw new Error(`Generated topic failed validation on attempt ${attempt}`);
        }
        
    } catch (error) {
        lastError = error as Error;
        console.error(`[News Service] ❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // If we hit rate limits (429) or quota exceeded, stop retrying immediately
        if (error.message.includes('429') || 
            error.message.includes('rate limit') || 
            error.message.includes('quota') ||
            error.message.includes('Quota exceeded') ||
            (error as any).response?.status === 429 ||
            (error as any).code === 'ERR_BAD_REQUEST') {
          console.log('[News Service] 🚫 Rate limit or quota exceeded, stopping retries to avoid further API abuse');
          break;
        }
        
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s delays
          console.log(`[News Service] ⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed, throw error
    console.error(`[News Service] 🚨 All ${maxRetries} attempts failed. Last error:`, lastError?.message);
    console.log('[News Service] ❌ No valid news article found, throwing error');
    
    throw new Error(`Failed to generate battle topic after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private getCacheKey(battleCount: number): string {
    const now = new Date();
    const utcDate = now.toISOString().split('T')[0];
    
    return `daily_battle_${utcDate}_${battleCount}`;
  }

  private async getBattleCountForToday(): Promise<number> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const battles = await this.db.getBattlesByDateRange(startOfDay, endOfDay);
      return battles.length + 1; // Next battle number
    } catch (error) {
      console.error('[News Service] Error getting battle count:', error);
      return 1; // Default to first battle of day
    }
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

  /**
   * Validate that the generated topic meets quality standards
   */
  private validateTopic(topic: DebateTopic): boolean {
    try {
      // Check if topic has required fields
      if (!topic.title || !topic.description || !topic.category || !topic.source) {
        console.log('[News Service] ❌ Topic missing required fields');
        return false;
      }

      // Check if title is not the fallback title
      if (topic.title === "AI Service Temporarily Unavailable") {
        console.log('[News Service] ❌ Topic is fallback title');
        return false;
      }

      // Check if title is meaningful (not too short or generic)
      if (topic.title.length < 10 || topic.title.length > 200) {
        console.log('[News Service] ❌ Topic title length invalid:', topic.title.length);
        return false;
      }

      // Check if description is meaningful
      if (topic.description.length < 20 || topic.description.length > 1000) {
        console.log('[News Service] ❌ Topic description length invalid:', topic.description.length);
        return false;
      }

      // Check if category is valid
      const validCategories = ['politics', 'technology', 'economics', 'economy', 'society', 'environment', 'health', 'education', 'sports', 'crypto'];
      if (!validCategories.includes(topic.category.toLowerCase())) {
        console.log('[News Service] ❌ Topic category invalid:', topic.category);
        return false;
      }

      // Check if debate points exist and are balanced
      if (!topic.debatePoints || !topic.debatePoints.Support || !topic.debatePoints.Oppose) {
        console.log('[News Service] ❌ Topic missing debate points');
        return false;
      }

      if (topic.debatePoints.Support.length < 2 || topic.debatePoints.Oppose.length < 2) {
        console.log('[News Service] ❌ Topic has insufficient debate points');
        return false;
      }

      // Check if debate points are meaningful
      const allPoints = [...topic.debatePoints.Support, ...topic.debatePoints.Oppose];
      const hasShortPoints = allPoints.some(point => point.length < 10);
      if (hasShortPoints) {
        console.log('[News Service] ❌ Topic has too short debate points');
        return false;
      }

      console.log('[News Service] ✅ Topic validation passed');
      return true;

    } catch (error) {
      console.error('[News Service] ❌ Topic validation error:', error);
      return false;
    }
  }

  private async checkTopicSimilarity(newTopicTitle: string): Promise<number> {
    try {
      // Get last 2 battles for similarity checking
      const recentBattles = await this.getRecentBattles(2);
      
      if (recentBattles.length === 0) {
        console.log('[News Service] No recent battles to compare against');
        return 0; // First battle of the day - no similarity
      }

      console.log(`[News Service] Checking similarity against ${recentBattles.length} recent battle descriptions...`);

      let maxSimilarity = 0;
      let mostSimilarBattle = '';

      // Check similarity against each recent battle using description for better context
      for (const battle of recentBattles) {
        const similarity = await this.calculateTopicSimilarity(newTopicTitle, battle.description);
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostSimilarBattle = battle.title;
        }
      }

      console.log(`[News Service] Calculated AI similarity: ${maxSimilarity.toFixed(3)}`);
      if (maxSimilarity > 0.3) {
        console.log(`[News Service] ❌ News article too similar (${maxSimilarity.toFixed(3)}) to recent battle description: "${mostSimilarBattle}"`);
      } else {
        console.log('[News Service] ✅ News article is sufficiently unique');
      }

      return maxSimilarity;

    } catch (error: any) {
      console.error('[News Service] ❌ Error checking topic similarity:', error);
      // Fallback to simple title matching if AI similarity fails
      return this.checkSimpleTitleSimilarity(newTopicTitle) ? 0.8 : 0;
    }
  }

  private async getRecentBattles(count: number): Promise<{ id: string; title: string; description: string }[]> {
    try {
      const battles = await this.db.getRecentBattles(count);
      return battles.map((battle: any) => ({
        id: battle.id,
        title: battle.title,
        description: battle.description
      }));
    } catch (error) {
      console.error('[News Service] Error getting recent battles:', error);
      return [];
    }
  }

  private async calculateTopicSimilarity(topic1: string, topic2: string): Promise<number> {
    const cacheKey = `${this.hashString(topic1)}|${this.hashString(topic2)}`;
    
    // Check cache first
    if (this.similarityCache.has(cacheKey)) {
      const cached = this.similarityCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
        console.log(`[News Service] Using cached similarity: ${cached.similarity.toFixed(3)}`);
        return cached.similarity;
      }
    }

    try {
      // Use AI-powered semantic similarity
      const similarity = await this.calculateAISimilarity(topic1, topic2);
      
      // Cache the result
      this.similarityCache.set(cacheKey, {
        similarity,
        timestamp: Date.now(),
        method: 'ai'
      });

      console.log(`[News Service] Calculated AI similarity: ${similarity.toFixed(3)}`);
      return similarity;

    } catch (error) {
      console.error('[News Service] AI similarity calculation failed:', error);
      // Fallback to simple title matching
      return this.calculateSimpleSimilarity(topic1, topic2);
    }
  }

  // Generate topic with different strategies based on attempt and similarity failures
  private async generateTopicWithStrategy(attempt: number, similarityFailures: number) {
    console.log(`[News Service] Using strategy for attempt ${attempt}, similarity failures: ${similarityFailures}`);
    
    if (attempt === 1) {
      // First attempt: Use normal cached approach
      return await this.agentOrchestrator.generateDailyBattleTopic();
    } else if (attempt === 2) {
      // Second attempt: Try different news categories or bypass cache
      return await this.agentOrchestrator.generateDailyBattleTopicWithVariation('different_category');
    } else {
      // Third attempt: Try completely different approach or broader topics
      return await this.agentOrchestrator.generateDailyBattleTopicWithVariation('broad_topic');
    }
  }


  private async calculateAISimilarity(topic1: string, topic2: string): Promise<number> {
    try {
      const prompt = `Compare these two debate topics and return a similarity score from 0.0 to 1.0:
      
Topic 1: "${topic1}"
Topic 2: "${topic2}"

Consider:
- Core concepts and themes
- Subject matter overlap
- Debate angle similarity
- Overall topic scope

Return only a number between 0.0 and 1.0 (e.g., 0.85 for very similar, 0.15 for very different):`;

      const response = await this.agentOrchestrator.generateText(prompt);
      const similarity = parseFloat(String(response).trim());
      
      if (isNaN(similarity) || similarity < 0 || similarity > 1) {
        throw new Error('Invalid similarity score from AI');
      }
      
      return similarity;

    } catch (error) {
      console.error('[News Service] AI similarity calculation error:', error);
      throw error;
    }
  }

  private calculateSimpleSimilarity(topic1: string, topic2: string): number {
    const words1 = new Set(topic1.toLowerCase().split(/\s+/));
    const words2 = new Set(topic2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    const jaccardSimilarity = intersection.size / union.size;
    console.log(`[News Service] Simple similarity: ${jaccardSimilarity.toFixed(3)}`);
    
    return jaccardSimilarity;
  }

  private checkSimpleTitleSimilarity(_newTopicTitle: string): boolean {
    // Simple fallback: check if title contains same key words
    // This is a simplified version - in practice, we'd need to await this
    return true; // Allow topic if simple check fails
  }

  private hashString(str: string): string {
    if (!str) return '0';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

const newsService = new NewsService();
export default newsService;
