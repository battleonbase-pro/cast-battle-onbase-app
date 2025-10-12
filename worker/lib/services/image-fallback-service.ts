// lib/services/image-fallback-service.ts
// Service to provide fallback images for news articles when no image is available

interface ImageFallbackOptions {
  width?: number;
  height?: number;
  category?: string;
  title?: string;
}

class ImageFallbackService {
  private static instance: ImageFallbackService;
  
  private constructor() {}
  
  static getInstance(): ImageFallbackService {
    if (!ImageFallbackService.instance) {
      ImageFallbackService.instance = new ImageFallbackService();
    }
    return ImageFallbackService.instance;
  }

  /**
   * Generate a fallback image URL based on article category and title
   */
  generateFallbackImage(options: ImageFallbackOptions): string {
    const { width = 120, height = 80, category = 'news', title = '' } = options;
    
    // Use Unsplash Source API for high-quality placeholder images
    const categoryKeywords = this.getCategoryKeywords(category);
    const searchQuery = encodeURIComponent(categoryKeywords);
    
    return `https://source.unsplash.com/${width}x${height}/?${searchQuery}`;
  }

  /**
   * Get relevant keywords for image search based on category
   */
  private getCategoryKeywords(category: string): string {
    const categoryMap: { [key: string]: string } = {
      politics: 'government,politics,election',
      technology: 'technology,computer,innovation',
      economy: 'business,economy,finance',
      crypto: 'cryptocurrency,bitcoin,blockchain',
      sports: 'sports,football,basketball',
      health: 'health,medical,healthcare',
      science: 'science,research,laboratory',
      entertainment: 'entertainment,movies,music',
      environment: 'nature,environment,climate',
      world: 'world,global,international',
      default: 'news,media,newspaper'
    };

    return categoryMap[category.toLowerCase()] || categoryMap.default;
  }

  /**
   * Check if an image URL is valid and accessible
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a random news-related placeholder image
   */
  getRandomNewsImage(width: number = 120, height: number = 80): string {
    const newsImages = [
      'newspaper,media',
      'breaking-news,headlines',
      'journalism,reporting',
      'world-news,global',
      'politics,government',
      'technology,innovation',
      'business,economy',
      'science,research'
    ];
    
    const randomImage = newsImages[Math.floor(Math.random() * newsImages.length)];
    return `https://source.unsplash.com/${width}x${height}/?${randomImage}`;
  }
}

export default ImageFallbackService;
