// lib/services/currents-news-service.ts
import axios from 'axios';

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

class CurrentsNewsService {
  private apiKey: string;
  private baseUrl: string = 'https://api.currentsapi.services/v1';

  constructor() {
    this.apiKey = process.env.CURRENTS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Currents News Service] CURRENTS_API_KEY not found in environment variables');
    }
  }

  async getComprehensiveNews(): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('Currents API key not configured');
    }

    try {
      console.log('[Currents News Service] Fetching comprehensive news...');
      
      const response = await axios.get(`${this.baseUrl}/latest-news`, {
        params: {
          country: 'us',
          pageSize: 25,
          apiKey: this.apiKey
        }
      });

      const articles = response.data.news || [];
      console.log(`[Currents News Service] Found ${articles.length} comprehensive news articles`);

      return articles.map(article => this.mapCurrentsArticleToStandard(article));

    } catch (error: any) {
      console.error('[Currents News Service] Error fetching comprehensive news:', error.message);
      throw error;
    }
  }

  async getWorldNews(): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('Currents API key not configured');
    }

    try {
      console.log('[Currents News Service] Fetching world news...');
      
      const response = await axios.get(`${this.baseUrl}/latest-news`, {
        params: {
          country: 'us',
          pageSize: 25,
          apiKey: this.apiKey
        }
      });

      const articles = response.data.news || [];
      console.log(`[Currents News Service] Found ${articles.length} world news articles`);

      return articles.map(article => this.mapCurrentsArticleToStandard(article));

    } catch (error: any) {
      console.error('[Currents News Service] Error fetching world news:', error.message);
      throw error;
    }
  }

  async getNewsByCategory(category: string): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('Currents API key not configured');
    }

    try {
      console.log(`[Currents News Service] Fetching ${category} news...`);
      
      const response = await axios.get(`${this.baseUrl}/latest-news`, {
        params: {
          category: category,
          country: 'us',
          pageSize: 15,
          apiKey: this.apiKey
        }
      });

      const articles = response.data.news || [];
      console.log(`[Currents News Service] Found ${articles.length} ${category} articles`);

      return articles.map(article => this.mapCurrentsArticleToStandard(article, category));

    } catch (error: any) {
      console.error(`[Currents News Service] Error fetching ${category} news:`, error.message);
      throw error;
    }
  }

  async getCryptoNews(): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('Currents API key not configured');
    }

    try {
      console.log('[Currents News Service] Fetching crypto news...');
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          keywords: 'bitcoin ethereum crypto regulation',
          pageSize: 20,
          sortBy: 'published',
          language: 'en',
          apiKey: this.apiKey
        }
      });

      const articles = response.data.news || [];
      console.log(`[Currents News Service] Found ${articles.length} crypto articles`);

      return articles.map(article => this.mapCurrentsArticleToStandard(article, 'crypto'));

    } catch (error: any) {
      console.error('[Currents News Service] Error fetching crypto news:', error.message);
      throw error;
    }
  }

  private mapCurrentsArticleToStandard(currentsArticle: any, category?: string): Article {
    return {
      title: currentsArticle.title,
      description: currentsArticle.description,
      url: currentsArticle.url,
      author: currentsArticle.author,
      published: currentsArticle.published,
      category: category ? [category] : currentsArticle.category || [],
      imageUrl: currentsArticle.image,
      thumbnail: currentsArticle.image
    };
  }
}

export default CurrentsNewsService;
