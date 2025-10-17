"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ImageFallbackService {
    constructor() { }
    static getInstance() {
        if (!ImageFallbackService.instance) {
            ImageFallbackService.instance = new ImageFallbackService();
        }
        return ImageFallbackService.instance;
    }
    generateFallbackImage(options) {
        const { width = 120, height = 80, category = 'news', title = '' } = options;
        const categoryKeywords = this.getCategoryKeywords(category);
        const searchQuery = encodeURIComponent(categoryKeywords);
        return `https://source.unsplash.com/${width}x${height}/?${searchQuery}`;
    }
    getCategoryKeywords(category) {
        const categoryMap = {
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
    async validateImageUrl(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    getRandomNewsImage(width = 120, height = 80) {
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
exports.default = ImageFallbackService;
