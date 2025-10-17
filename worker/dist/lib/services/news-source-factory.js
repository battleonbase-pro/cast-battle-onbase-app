"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serper_news_service_1 = __importDefault(require("./serper-news-service"));
class NewsSourceFactory {
    constructor() {
        this.newsSource = 'serper';
        this.currentService = this.createService(this.newsSource);
        console.log(`[News Source Factory] Initialized with ${this.newsSource} API`);
    }
    static getInstance() {
        if (!NewsSourceFactory.instance) {
            NewsSourceFactory.instance = new NewsSourceFactory();
        }
        return NewsSourceFactory.instance;
    }
    createService(source) {
        switch (source.toLowerCase()) {
            case 'serper':
            default:
                return new serper_news_service_1.default();
        }
    }
    getService() {
        return this.currentService;
    }
    getCurrentSource() {
        return this.newsSource;
    }
    switchSource(newSource) {
        if (newSource !== this.newsSource) {
            console.log(`[News Source Factory] Switching from ${this.newsSource} to ${newSource}`);
            this.newsSource = newSource;
            this.currentService = this.createService(newSource);
        }
    }
    async getWorldNews() {
        return this.currentService.getWorldNews();
    }
    async getNewsByCategory(category) {
        return this.currentService.getNewsByCategory(category);
    }
    async getCryptoNews() {
        return this.currentService.getCryptoNews();
    }
    async getComprehensiveNews() {
        return this.currentService.getComprehensiveNews();
    }
}
exports.default = NewsSourceFactory;
