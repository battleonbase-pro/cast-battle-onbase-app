// lib/services/news-source-factory.ts
import CurrentsNewsService from './currents-news-service';
import SerperNewsService from './serper-news-service';

interface Article {
  title: string;
  description?: string;
  url: string;
  author?: string;
  published: string;
  category?: string[];
}

interface NewsService {
  getWorldNews(): Promise<Article[]>;
  getNewsByCategory(category: string): Promise<Article[]>;
  getCryptoNews(): Promise<Article[]>;
  getComprehensiveNews(): Promise<Article[]>;
}

class NewsSourceFactory {
  private static instance: NewsSourceFactory;
  private currentService: NewsService;
  private newsSource: string;

  private constructor() {
    this.newsSource = process.env.NEWS_SOURCE || 'currents';
    this.currentService = this.createService(this.newsSource);
    console.log(`[News Source Factory] Initialized with ${this.newsSource} API`);
  }

  static getInstance(): NewsSourceFactory {
    if (!NewsSourceFactory.instance) {
      NewsSourceFactory.instance = new NewsSourceFactory();
    }
    return NewsSourceFactory.instance;
  }

  private createService(source: string): NewsService {
    switch (source.toLowerCase()) {
      case 'serper':
        return new SerperNewsService();
      case 'currents':
      default:
        return new CurrentsNewsService();
    }
  }

  getService(): NewsService {
    return this.currentService;
  }

  getCurrentSource(): string {
    return this.newsSource;
  }

  switchSource(newSource: string): void {
    if (newSource !== this.newsSource) {
      console.log(`[News Source Factory] Switching from ${this.newsSource} to ${newSource}`);
      this.newsSource = newSource;
      this.currentService = this.createService(newSource);
    }
  }

  async getWorldNews(): Promise<Article[]> {
    return this.currentService.getWorldNews();
  }

  async getNewsByCategory(category: string): Promise<Article[]> {
    return this.currentService.getNewsByCategory(category);
  }

  async getCryptoNews(): Promise<Article[]> {
    return this.currentService.getCryptoNews();
  }

  async getComprehensiveNews(): Promise<Article[]> {
    return this.currentService.getComprehensiveNews();
  }
}

export default NewsSourceFactory;
