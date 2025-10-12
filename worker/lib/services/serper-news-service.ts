// lib/services/serper-news-service.ts
import axios from 'axios';

interface SerperArticle {
  title: string;
  link: string;
  snippet?: string;
  date?: string;
  position?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  source?: string;
  sitelinks?: Array<{
    title: string;
    link: string;
  }>;
}

interface SerperResponse {
  organic?: SerperArticle[];
  news: SerperArticle[];
  topStories?: SerperArticle[];
}

interface Article {
  title: string;
  description?: string;
  url: string;
  author?: string;
  published: string;
  category?: string[];
  imageUrl?: string;
  thumbnail?: string;
}

class SerperNewsService {
  private apiKey: string;
  private baseUrl: string = 'https://google.serper.dev';

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Serper News Service] SERPER_API_KEY not found in environment variables');
    }
  }

  async searchNews(query: string, category?: string): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('Serper API key not configured');
    }

    try {
      console.log(`[Serper News Service] Searching for: "${query}"`);
      
      const searchQuery = this.buildSearchQuery(query, category);
      
      const response = await axios.post(`${this.baseUrl}/news`, {
        q: searchQuery,
        num: 20,
        gl: 'us', // Country: United States
        hl: 'en', // Language: English
        safe: 'off' // Allow all content for news
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const data: SerperResponse = response.data;
      // Use news array directly as it contains imageUrl
      const articles = data.news || [];

      console.log(`[Serper News Service] Found ${articles.length} articles for "${query}"`);
      console.log(`[Serper News Service] Using news endpoint data`);

      return articles.map(article => this.mapSerperArticleToStandard(article, category));

    } catch (error: any) {
      console.error(`[Serper News Service] Error searching news for "${query}":`, error.message);
      throw error;
    }
  }

  async getComprehensiveNews(): Promise<Article[]> {
    try {
      // Use balanced dynamic query for diverse results
      const query = this.generateDynamicQuery();
      console.log(`[Serper News Service] Searching with balanced dynamic query: "${query}"`);
      
      const articles = await this.searchNews(query);
      console.log(`[Serper News Service] Total comprehensive news articles: ${articles.length}`);
      
      // If we get too few articles, try a fallback approach
      if (articles.length < 5) {
        console.log(`[Serper News Service] Low article count (${articles.length}), trying fallback approach...`);
        const fallbackArticles = await this.getFallbackNews();
        return [...articles, ...fallbackArticles].slice(0, 25); // Limit total results
      }
      
      return articles;
    } catch (error) {
      console.warn(`[Serper News Service] Failed to fetch comprehensive news:`, error);
      return [];
    }
  }

  private async getFallbackNews(): Promise<Article[]> {
    // Fallback: try different category-based searches
    const categories = ['politics', 'world', 'economy', 'technology', 'health'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    try {
      console.log(`[Serper News Service] Fallback: trying ${randomCategory} category`);
      return await this.getNewsByCategory(randomCategory);
    } catch (error) {
      console.warn(`[Serper News Service] Fallback also failed:`, error);
      return [];
    }
  }

  private generateDynamicQuery(): string {
    // Core keyword groups for different topics - balanced distribution
    const keywordGroups = {
      breaking: ['breaking news', 'urgent news', 'latest news', 'top news'],
      politics: ['politics', 'election', 'government', 'president', 'congress', 'policy'],
      world: ['world news', 'international', 'global', 'headlines', 'foreign affairs'],
      economy: ['economy', 'market', 'finance', 'business', 'economic policy'],
      tech: ['technology', 'AI', 'artificial intelligence', 'tech', 'innovation'],
      crypto: ['cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'crypto', 'digital currency']
    };

    // Select one keyword from each group
    const selectedKeywords = Object.values(keywordGroups).map(group => 
      group[Math.floor(Math.random() * group.length)]
    );

    // Randomize the order of keywords
    const shuffledKeywords = this.shuffleArray([...selectedKeywords]);

    // Add time-based keywords
    const timeKeywords = ['today', 'latest', 'recent'];
    const timeKeyword = timeKeywords[Math.floor(Math.random() * timeKeywords.length)];

    // Combine keywords with randomization
    const query = [...shuffledKeywords, timeKeyword].join(' ');
    
    console.log(`[Serper News Service] Generated balanced dynamic query: "${query}"`);
    return query;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async getWorldNews(): Promise<Article[]> {
    // Optimized: Use single comprehensive query instead of 4 separate calls
    const query = 'breaking news today world headlines international';
    
    try {
      const articles = await this.searchNews(query);
      console.log(`[Serper News Service] Total unique world news articles: ${articles.length}`);
      return articles;
    } catch (error) {
      console.warn(`[Serper News Service] Failed to fetch world news:`, error);
      return [];
    }
  }

  async getNewsByCategory(category: string): Promise<Article[]> {
    // Optimized: Use single comprehensive query instead of multiple calls
    const optimizedQuery = this.getOptimizedCategoryQuery(category);
    
    try {
      const articles = await this.searchNews(optimizedQuery, category);
      console.log(`[Serper News Service] Total unique ${category} articles: ${articles.length}`);
      return articles;
    } catch (error) {
      console.warn(`[Serper News Service] Failed to fetch ${category} news:`, error);
      return [];
    }
  }

  async getCryptoNews(): Promise<Article[]> {
    // Optimized: Use single comprehensive query instead of 8 separate calls
    const query = 'bitcoin ethereum cryptocurrency news today blockchain defi';
    
    try {
      const articles = await this.searchNews(query, 'crypto');
      console.log(`[Serper News Service] Total unique crypto articles: ${articles.length}`);
      return articles;
    } catch (error) {
      console.warn(`[Serper News Service] Failed to fetch crypto news:`, error);
      return [];
    }
  }

  private buildSearchQuery(query: string, category?: string): string {
    let searchQuery = query;
    
    // Add category-specific terms
    if (category) {
      switch (category.toLowerCase()) {
        case 'politics':
          searchQuery += ' politics government election';
          break;
        case 'economy':
          searchQuery += ' economy business finance market';
          break;
        case 'technology':
          searchQuery += ' technology tech innovation';
          break;
        case 'crypto':
          searchQuery += ' cryptocurrency bitcoin ethereum blockchain';
          break;
        case 'sports':
          searchQuery += ' sports football basketball';
          break;
        case 'health':
          searchQuery += ' health medical healthcare';
          break;
      }
    }

    // Add recency terms
    searchQuery += ' today latest recent';
    
    return searchQuery;
  }

  private getOptimizedCategoryQuery(category: string): string {
    const optimizedQueries: { [key: string]: string } = {
      politics: 'political news today election government policy',
      economy: 'economic news today stock market business finance',
      technology: 'technology news today AI artificial intelligence tech innovation',
      crypto: 'cryptocurrency news today bitcoin ethereum blockchain',
      sports: 'sports news today football basketball highlights',
      health: 'health news today medical healthcare research',
      science: 'science news today research discovery innovation',
      entertainment: 'entertainment news today movies music celebrity'
    };

    return optimizedQueries[category.toLowerCase()] || `${category} news today`;
  }

  private getCategoryQueries(category: string): string[] {
    const categoryMap: { [key: string]: string[] } = {
      politics: [
        'political news today',
        'election news',
        'government policy news',
        'political analysis',
        'campaign news'
      ],
      economy: [
        'economic news today',
        'stock market news',
        'business news',
        'financial news',
        'economic policy'
      ],
      technology: [
        'technology news today',
        'tech innovation news',
        'AI artificial intelligence news',
        'startup news',
        'tech industry news'
      ],
      crypto: [
        'cryptocurrency news today',
        'bitcoin news',
        'ethereum news',
        'crypto market news',
        'blockchain news'
      ],
      sports: [
        'sports news today',
        'football news',
        'basketball news',
        'sports highlights',
        'sports analysis'
      ],
      health: [
        'health news today',
        'medical news',
        'healthcare news',
        'medical research',
        'health policy'
      ]
    };

    return categoryMap[category.toLowerCase()] || [`${category} news today`];
  }

  private mapSerperArticleToStandard(serperArticle: SerperArticle, category?: string): Article {
    // Extract source from URL domain or use provided source field
    const source = serperArticle.source || this.extractSourceFromUrl(serperArticle.link);
    
    // Convert relative date to ISO string
    const publishedDate = this.convertRelativeDate(serperArticle.date);
    
    // Use imageUrl, thumbnailUrl, or thumbnail (in order of preference)
    const imageUrl = serperArticle.imageUrl || serperArticle.thumbnailUrl || serperArticle.thumbnail;
    
    return {
      title: serperArticle.title,
      description: serperArticle.snippet || '', // topStories might not have snippet
      url: serperArticle.link,
      author: source,
      published: publishedDate,
      category: category ? [category] : [],
      imageUrl: imageUrl,
      thumbnail: imageUrl
    };
  }

  private extractSourceFromUrl(url: string): string {
    try {
      const domain = new URL(url).hostname;
      // Remove www. prefix and extract main domain
      const cleanDomain = domain.replace(/^www\./, '');
      
      // Extract the main part of the domain (e.g., "cnn.com" -> "CNN")
      const parts = cleanDomain.split('.');
      if (parts.length >= 2) {
        const mainDomain = parts[0];
        // Convert to title case
        return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      }
      
      return cleanDomain;
    } catch (error) {
      console.warn(`[Serper News Service] Failed to extract source from URL: ${url}`);
      return 'Unknown';
    }
  }

  private convertRelativeDate(relativeDate?: string): string {
    if (!relativeDate) {
      return new Date().toISOString();
    }

    const now = new Date();
    
    // Handle common relative date formats
    if (relativeDate.includes('hour')) {
      const hours = parseInt(relativeDate.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
    } else if (relativeDate.includes('day')) {
      const days = parseInt(relativeDate.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    } else if (relativeDate.includes('week')) {
      const weeks = parseInt(relativeDate.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (relativeDate.includes('month')) {
      const months = parseInt(relativeDate.match(/\d+/)?.[0] || '0');
      return new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // If we can't parse it, return current time
    return new Date().toISOString();
  }

  private removeDuplicateArticles(articles: Article[]): Article[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      if (seen.has(article.url)) {
        return false;
      }
      seen.add(article.url);
      return true;
    });
  }
}

export default SerperNewsService;
