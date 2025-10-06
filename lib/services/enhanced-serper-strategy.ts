// lib/services/enhanced-serper-strategy.ts
import axios from 'axios';

interface SearchStrategy {
  name: string;
  queries: string[];
  weight: number;
  timeRange: 'hour' | 'day' | 'week';
  geoFocus?: string;
}

interface EnhancedSearchConfig {
  strategies: SearchStrategy[];
  maxResultsPerStrategy: number;
  deduplicationMethod: 'url' | 'title' | 'content';
  qualityFilters: {
    minTitleLength: number;
    maxTitleLength: number;
    excludeKeywords: string[];
    requireKeywords: string[];
  };
}

class EnhancedSerperStrategy {
  private apiKey: string;
  private baseUrl: string = 'https://google.serper.dev';

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || '';
  }

  // Strategic search configurations for different categories
  getSearchStrategies(category: string): SearchStrategy[] {
    const baseStrategies: { [key: string]: SearchStrategy[] } = {
      politics: [
        {
          name: 'breaking_politics',
          queries: [
            'breaking political news today',
            'urgent political developments',
            'political crisis news'
          ],
          weight: 1.0,
          timeRange: 'hour'
        },
        {
          name: 'policy_analysis',
          queries: [
            'government policy analysis',
            'political policy impact',
            'legislative news analysis'
          ],
          weight: 0.8,
          timeRange: 'day'
        },
        {
          name: 'election_coverage',
          queries: [
            'election news today',
            'campaign updates',
            'voting news'
          ],
          weight: 0.9,
          timeRange: 'day',
          geoFocus: 'us'
        },
        {
          name: 'international_politics',
          queries: [
            'international political news',
            'global politics today',
            'world political events'
          ],
          weight: 0.7,
          timeRange: 'day'
        }
      ],
      
      crypto: [
        {
          name: 'market_movers',
          queries: [
            'crypto market news today',
            'bitcoin price news',
            'ethereum market update',
            'cryptocurrency price analysis'
          ],
          weight: 1.0,
          timeRange: 'hour'
        },
        {
          name: 'regulatory_updates',
          queries: [
            'crypto regulation news',
            'bitcoin regulation update',
            'cryptocurrency legal news',
            'SEC crypto news'
          ],
          weight: 0.9,
          timeRange: 'day'
        },
        {
          name: 'technology_breakthroughs',
          queries: [
            'blockchain technology news',
            'crypto innovation news',
            'defi protocol news',
            'nft technology update'
          ],
          weight: 0.8,
          timeRange: 'day'
        },
        {
          name: 'adoption_news',
          queries: [
            'crypto adoption news',
            'bitcoin adoption update',
            'cryptocurrency mainstream news',
            'crypto institutional news'
          ],
          weight: 0.7,
          timeRange: 'week'
        }
      ],

      technology: [
        {
          name: 'ai_breakthroughs',
          queries: [
            'AI artificial intelligence news today',
            'machine learning breakthrough',
            'AI technology update',
            'ChatGPT OpenAI news'
          ],
          weight: 1.0,
          timeRange: 'day'
        },
        {
          name: 'startup_ecosystem',
          queries: [
            'tech startup news',
            'startup funding news',
            'tech innovation startup',
            'unicorn startup news'
          ],
          weight: 0.8,
          timeRange: 'day'
        },
        {
          name: 'big_tech_updates',
          queries: [
            'Google news today',
            'Apple news update',
            'Microsoft news today',
            'Meta Facebook news'
          ],
          weight: 0.9,
          timeRange: 'day'
        }
      ],

      economy: [
        {
          name: 'market_analysis',
          queries: [
            'stock market news today',
            'economic analysis today',
            'market trends analysis',
            'economic indicators news'
          ],
          weight: 1.0,
          timeRange: 'hour'
        },
        {
          name: 'fed_policy',
          queries: [
            'Federal Reserve news',
            'interest rate news',
            'Fed policy update',
            'monetary policy news'
          ],
          weight: 0.9,
          timeRange: 'day'
        },
        {
          name: 'inflation_updates',
          queries: [
            'inflation news today',
            'CPI inflation data',
            'economic inflation update',
            'price inflation news'
          ],
          weight: 0.8,
          timeRange: 'day'
        }
      ]
    };

    return baseStrategies[category.toLowerCase()] || baseStrategies.politics;
  }

  // Enhanced search with strategic weighting
  async searchWithStrategy(category: string, maxResults: number = 50): Promise<any[]> {
    const strategies = this.getSearchStrategies(category);
    const allResults: any[] = [];
    const resultsPerStrategy = Math.ceil(maxResults / strategies.length);

    console.log(`[Enhanced Strategy] Using ${strategies.length} strategies for ${category}`);

    for (const strategy of strategies) {
      try {
        const strategyResults = await this.executeStrategy(strategy, resultsPerStrategy);
        
        // Apply weight to results
        const weightedResults = strategyResults.map(result => ({
          ...result,
          strategyWeight: strategy.weight,
          strategyName: strategy.name,
          score: this.calculateRelevanceScore(result, strategy)
        }));

        allResults.push(...weightedResults);
        console.log(`[Enhanced Strategy] ${strategy.name}: ${strategyResults.length} results`);
        
      } catch (error) {
        console.warn(`[Enhanced Strategy] Failed strategy ${strategy.name}:`, error);
      }
    }

    // Sort by combined score and remove duplicates
    const sortedResults = this.rankAndDeduplicate(allResults, maxResults);
    
    console.log(`[Enhanced Strategy] Final results: ${sortedResults.length} articles`);
    return sortedResults;
  }

  private async executeStrategy(strategy: SearchStrategy, maxResults: number): Promise<any[]> {
    const allResults: any[] = [];

    for (const query of strategy.queries) {
      try {
        const response = await axios.post(`${this.baseUrl}/search`, {
          q: query,
          num: Math.min(10, Math.ceil(maxResults / strategy.queries.length)),
          gl: strategy.geoFocus || 'us',
          hl: 'en',
          tbm: 'nws',
          // Add time-based filtering if supported
          ...(strategy.timeRange === 'hour' && { tbs: 'qdr:h' }),
          ...(strategy.timeRange === 'day' && { tbs: 'qdr:d' }),
          ...(strategy.timeRange === 'week' && { tbs: 'qdr:w' })
        }, {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        });

        const articles = response.data.news || response.data.organic || [];
        allResults.push(...articles);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`[Enhanced Strategy] Query failed "${query}":`, error);
      }
    }

    return allResults;
  }

  private calculateRelevanceScore(article: any, strategy: SearchStrategy): number {
    let score = strategy.weight;

    // Boost score for recent articles
    const publishedDate = new Date(article.date || Date.now());
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo < 1) score += 0.3;      // Very recent
    else if (hoursAgo < 6) score += 0.2; // Recent
    else if (hoursAgo < 24) score += 0.1; // Today

    // Boost score for high-quality sources
    const qualitySources = ['reuters', 'ap', 'bbc', 'cnn', 'bloomberg', 'wsj', 'nytimes'];
    const source = article.source?.toLowerCase() || '';
    if (qualitySources.some(qs => source.includes(qs))) {
      score += 0.2;
    }

    // Boost score for longer, more detailed titles
    const titleLength = article.title?.length || 0;
    if (titleLength > 50 && titleLength < 150) {
      score += 0.1;
    }

    return Math.min(score, 2.0); // Cap at 2.0
  }

  private rankAndDeduplicate(results: any[], maxResults: number): any[] {
    // Remove duplicates by URL
    const seen = new Set<string>();
    const uniqueResults = results.filter(result => {
      if (seen.has(result.link)) return false;
      seen.add(result.link);
      return true;
    });

    // Sort by score (highest first)
    const sortedResults = uniqueResults.sort((a, b) => b.score - a.score);

    return sortedResults.slice(0, maxResults);
  }

  // Advanced query building with context awareness
  buildContextualQuery(baseQuery: string, context: {
    category: string;
    timeSensitivity: 'breaking' | 'analysis' | 'background';
    geographicFocus?: string;
    audienceLevel: 'general' | 'expert';
  }): string {
    let query = baseQuery;

    // Add time sensitivity modifiers
    switch (context.timeSensitivity) {
      case 'breaking':
        query += ' breaking urgent latest';
        break;
      case 'analysis':
        query += ' analysis explanation detailed';
        break;
      case 'background':
        query += ' overview summary context';
        break;
    }

    // Add audience level modifiers
    if (context.audienceLevel === 'expert') {
      query += ' technical professional industry';
    } else {
      query += ' simple easy understand';
    }

    // Add geographic focus
    if (context.geographicFocus) {
      query += ` ${context.geographicFocus}`;
    }

    return query;
  }
}

export default EnhancedSerperStrategy;
