"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_agent_1 = __importDefault(require("./base-agent"));
const news_source_factory_1 = __importDefault(require("../services/news-source-factory"));
const image_fallback_service_1 = __importDefault(require("../services/image-fallback-service"));
class NewsCuratorAgent extends base_agent_1.default {
    constructor(apiKey) {
        super('News Curator', 'Content Discovery & Filtering', apiKey);
        this.newsSourceFactory = news_source_factory_1.default.getInstance();
        this.cache = new Map();
        const battleDurationHours = parseFloat(process.env.BATTLE_DURATION_HOURS || '4');
        this.cacheTimeout = battleDurationHours * 60 * 60 * 1000;
    }
    async findDailyBattleTopicWithVariation(strategy) {
        this.logActivity(`Starting daily battle topic discovery with ${strategy} strategy`);
        try {
            let articles = [];
            if (strategy === 'different_category') {
                console.log('[News Curator] Trying different categories to avoid similarity...');
                const [techNews, businessNews, healthNews] = await Promise.all([
                    this.fetchNewsByCategory('technology', 'us'),
                    this.fetchNewsByCategory('business', 'us'),
                    this.fetchNewsByCategory('health', 'us')
                ]);
                articles = [...techNews, ...businessNews, ...healthNews];
            }
            else if (strategy === 'broad_topic') {
                console.log('[News Curator] Trying broader topics to avoid similarity...');
                const [generalNews, scienceNews, entertainmentNews] = await Promise.all([
                    this.fetchWorldNews(),
                    this.fetchNewsByCategory('science', 'us'),
                    this.fetchNewsByCategory('entertainment', 'us')
                ]);
                articles = [...generalNews, ...scienceNews, ...entertainmentNews];
            }
            const relevantArticles = this.filterRelevantArticles(articles);
            const scoredArticles = relevantArticles.map(article => ({
                ...article,
                score: this.calculateEngagementScore(article)
            }));
            const hottestArticle = scoredArticles.sort((a, b) => b.score - a.score)[0];
            if (!hottestArticle) {
                throw new Error(`No relevant articles found with ${strategy} strategy`);
            }
            const curatedTopic = {
                title: hottestArticle.title,
                description: hottestArticle.description || hottestArticle.title,
                category: this.categorizeArticle(hottestArticle),
                source: hottestArticle.author || 'Unknown',
                articleUrl: hottestArticle.url,
                score: hottestArticle.score,
                publishedAt: hottestArticle.published,
                strategy
            };
            this.logActivity(`Successfully curated daily battle topic with ${strategy} strategy`, {
                title: curatedTopic.title,
                category: curatedTopic.category,
                score: curatedTopic.score
            });
            return curatedTopic;
        }
        catch (error) {
            this.logActivity(`Error in daily battle topic discovery with ${strategy} strategy`, { error: error.message });
            throw error;
        }
    }
    async findDailyBattleTopic() {
        this.logActivity('Starting daily battle topic discovery');
        try {
            const cacheKey = this.getCacheKey();
            const cached = this.cache.get(cacheKey);
            if (cached && this.isCacheValid(cached.timestamp)) {
                this.logActivity('Returning cached topic', { topic: cached.data.title });
                return cached.data;
            }
            const allArticles = await this.fetchComprehensiveNews();
            const relevantArticles = this.filterRelevantArticles(allArticles);
            const scoredArticles = relevantArticles.map(article => ({
                ...article,
                score: this.calculateEngagementScore(article)
            }));
            const hottestArticle = scoredArticles.sort((a, b) => b.score - a.score)[0];
            if (!hottestArticle) {
                throw new Error('No relevant articles found');
            }
            const imageFallbackService = image_fallback_service_1.default.getInstance();
            const category = this.categorizeArticle(hottestArticle);
            const imageUrl = hottestArticle.imageUrl || hottestArticle.thumbnail ||
                imageFallbackService.generateFallbackImage({
                    category: category,
                    title: hottestArticle.title
                });
            const curatedTopic = {
                id: `curated_${Date.now()}`,
                title: hottestArticle.title,
                description: hottestArticle.description,
                source: hottestArticle.author || 'Unknown',
                articleUrl: hottestArticle.url,
                publishedAt: hottestArticle.published,
                category: category,
                engagementScore: hottestArticle.score,
                relevanceFactors: this.extractRelevanceFactors(hottestArticle),
                articleData: hottestArticle,
                imageUrl: imageUrl,
                thumbnail: imageUrl,
                curatedBy: 'News Curator',
                curatedAt: new Date().toISOString()
            };
            this.cache.set(cacheKey, {
                data: curatedTopic,
                timestamp: new Date()
            });
            this.logActivity('Successfully curated daily battle topic', {
                title: curatedTopic.title,
                score: curatedTopic.engagementScore,
                category: curatedTopic.category
            });
            return curatedTopic;
        }
        catch (error) {
            this.logActivity('Error in daily battle topic discovery', { error: error.message });
            throw error;
        }
    }
    async fetchComprehensiveNews() {
        try {
            console.log('[News Curator] Fetching comprehensive news...');
            const articles = await this.newsSourceFactory.getComprehensiveNews();
            console.log(`[News Curator] Found ${articles.length} comprehensive news articles`);
            return articles;
        }
        catch (error) {
            console.error('[News Curator] Error fetching comprehensive news:', error.message);
            return [];
        }
    }
    async fetchWorldNews() {
        try {
            console.log('[News Curator] Fetching world news...');
            const articles = await this.newsSourceFactory.getWorldNews();
            console.log(`[News Curator] Found ${articles.length} world news articles`);
            return articles;
        }
        catch (error) {
            console.error('[News Curator] Error fetching world news:', error.message);
            return [];
        }
    }
    async fetchNewsByCategory(category, country) {
        try {
            console.log(`[News Curator] Fetching ${category} news...`);
            const articles = await this.newsSourceFactory.getNewsByCategory(category);
            console.log(`[News Curator] Found ${articles.length} ${category} articles`);
            return articles;
        }
        catch (error) {
            console.error(`[News Curator] Error fetching ${category} news:`, error.message);
            return [];
        }
    }
    async fetchCryptoNews() {
        try {
            console.log('[News Curator] Fetching crypto news...');
            const articles = await this.newsSourceFactory.getCryptoNews();
            console.log(`[News Curator] Found ${articles.length} crypto articles`);
            return articles;
        }
        catch (error) {
            console.error('[News Curator] Error fetching crypto news:', error.message);
            return [];
        }
    }
    filterRelevantArticles(articles) {
        const highImpactKeywords = [
            'us president', 'american president', 'president of the united states', 'potus',
            'presidential decision', 'presidential policy', 'presidential administration',
            'president foreign policy', 'president trade', 'president china', 'president russia', 'president nato',
            'president immigration', 'president border', 'president sanctions', 'president tariffs',
            'president election', 'president campaign', 'president speech', 'president rally',
            'white house', 'oval office', 'presidential order', 'executive order',
            'election', 'president', 'congress', 'senate', 'house', 'democrat', 'republican',
            'policy', 'regulation', 'government', 'federal', 'state', 'local',
            'trump', 'biden', 'harris', 'politics', 'political',
            'war', 'conflict', 'sanctions', 'trade war', 'diplomacy', 'international',
            'nato', 'un', 'eu', 'china', 'russia', 'iran', 'north korea',
            'immigration', 'border', 'refugee', 'asylum',
            'crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'web3',
            'sec', 'cftc', 'regulation', 'tax', 'stablecoin', 'cbdc',
            'binance', 'coinbase', 'kraken', 'ftx', 'celsius', 'voyager',
            'etf', 'spot etf', 'bitcoin etf', 'ethereum etf',
            'halving', 'mining', 'hash rate', 'difficulty',
            'layer 2', 'scaling', 'gas fees', 'transaction fees',
            'institutional', 'adoption', 'mainstream', 'corporate',
            'economy', 'inflation', 'recession', 'market', 'trading', 'banking',
            'fed', 'federal reserve', 'monetary policy', 'interest rates',
            'gdp', 'unemployment', 'jobs', 'employment',
            'ai', 'artificial intelligence', 'tech', 'technology', 'innovation',
            'privacy', 'surveillance', 'big tech', 'social media',
            'quantum', 'cybersecurity', 'data breach', 'hack'
        ];
        return articles.filter((article) => {
            const content = `${article.title} ${article.description || ''}`.toLowerCase();
            return highImpactKeywords.some(keyword => content.includes(keyword));
        });
    }
    calculateEngagementScore(article) {
        let score = 0;
        const title = article.title?.toLowerCase() || '';
        const description = article.description?.toLowerCase() || '';
        const content = `${title} ${description}`;
        const credibleSources = [
            'reuters', 'ap', 'bbc', 'cnn', 'fox news', 'nbc', 'abc', 'cbs',
            'washington post', 'new york times', 'wall street journal', 'bloomberg',
            'politico', 'axios', 'techcrunch', 'coindesk', 'cointelegraph'
        ];
        if (credibleSources.some(source => article.author?.toLowerCase().includes(source))) {
            score += 40;
        }
        const engagementKeywords = {
            'breaking': 30, 'urgent': 25, 'major': 20, 'historic': 25,
            'significant': 15, 'exclusive': 20, 'developing': 15
        };
        Object.entries(engagementKeywords).forEach(([keyword, points]) => {
            if (content.includes(keyword))
                score += points;
        });
        const topicKeywords = {
            'us president': 60, 'american president': 60, 'president of the united states': 60, 'potus': 60,
            'presidential decision': 55, 'presidential policy': 55, 'presidential administration': 55,
            'president foreign policy': 50, 'president trade': 50, 'president china': 50, 'president russia': 50, 'president nato': 50,
            'president immigration': 45, 'president border': 45, 'president sanctions': 45, 'president tariffs': 45,
            'president election': 50, 'president campaign': 45, 'president speech': 45, 'president rally': 45,
            'white house': 50, 'oval office': 50, 'presidential order': 50, 'executive order': 50,
            'election': 50, 'president': 45, 'war': 45, 'conflict': 40,
            'sanctions': 35, 'trade war': 35, 'diplomacy': 30,
            'nato': 30, 'china': 30, 'russia': 30, 'iran': 25,
            'immigration': 25, 'border': 20,
            'crypto': 40, 'bitcoin': 35, 'ethereum': 30, 'blockchain': 25,
            'sec': 35, 'cftc': 30, 'regulation': 25, 'etf': 30,
            'binance': 25, 'coinbase': 25, 'institutional': 25,
            'halving': 20, 'mining': 15, 'defi': 20,
            'economy': 25, 'inflation': 20, 'fed': 25, 'interest rates': 20,
            'gdp': 15, 'unemployment': 15,
            'ai': 25, 'tech': 15, 'cybersecurity': 20, 'data breach': 15
        };
        Object.entries(topicKeywords).forEach(([keyword, points]) => {
            if (content.includes(keyword))
                score += points;
        });
        const publishedAt = new Date(article.published);
        const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 1)
            score += 10;
        else if (hoursAgo < 6)
            score += 8;
        else if (hoursAgo < 12)
            score += 5;
        else if (hoursAgo < 24)
            score += 2;
        return Math.min(score, 100);
    }
    categorizeArticle(article) {
        const content = `${article.title} ${article.description || ''}`.toLowerCase();
        if (content.includes('us president') || content.includes('american president') ||
            content.includes('president of the united states') || content.includes('potus') ||
            content.includes('presidential decision') || content.includes('presidential policy') ||
            content.includes('presidential administration') || content.includes('president foreign policy') ||
            content.includes('president trade') || content.includes('president china') ||
            content.includes('president russia') || content.includes('president nato') ||
            content.includes('president immigration') || content.includes('president border') ||
            content.includes('president sanctions') || content.includes('president tariffs') ||
            content.includes('president election') || content.includes('president campaign') ||
            content.includes('white house') || content.includes('oval office') ||
            content.includes('presidential order') || content.includes('executive order')) {
            return 'politics';
        }
        if (content.includes('crypto') || content.includes('bitcoin') || content.includes('ethereum') ||
            content.includes('blockchain') || content.includes('defi') || content.includes('nft') ||
            content.includes('sec') || content.includes('cftc') || content.includes('etf')) {
            return 'crypto';
        }
        if (content.includes('election') || content.includes('president') || content.includes('congress') ||
            content.includes('war') || content.includes('conflict') || content.includes('sanctions') ||
            content.includes('nato') || content.includes('china') || content.includes('russia') ||
            content.includes('immigration') || content.includes('border')) {
            return 'politics';
        }
        if (content.includes('economy') || content.includes('inflation') || content.includes('market') ||
            content.includes('fed') || content.includes('interest rates') || content.includes('gdp')) {
            return 'economy';
        }
        if (content.includes('ai') || content.includes('tech') || content.includes('technology') ||
            content.includes('cybersecurity') || content.includes('data breach')) {
            return 'technology';
        }
        return 'general';
    }
    extractRelevanceFactors(article) {
        const content = `${article.title} ${article.description || ''}`.toLowerCase();
        const factors = [];
        if (content.includes('breaking'))
            factors.push('breaking_news');
        if (content.includes('urgent'))
            factors.push('urgent_news');
        if (content.includes('major'))
            factors.push('major_news');
        if (content.includes('us president') || content.includes('american president') ||
            content.includes('president of the united states') || content.includes('potus'))
            factors.push('us_president_global_impact');
        if (content.includes('presidential administration'))
            factors.push('presidential_administration');
        if (content.includes('presidential policy') || content.includes('presidential decision'))
            factors.push('presidential_policy_impact');
        if (content.includes('president foreign policy'))
            factors.push('president_foreign_policy');
        if (content.includes('president trade') || content.includes('president tariffs'))
            factors.push('president_trade_policy');
        if (content.includes('president china') || content.includes('president russia'))
            factors.push('president_international_relations');
        if (content.includes('president nato'))
            factors.push('president_nato_policy');
        if (content.includes('president immigration') || content.includes('president border'))
            factors.push('president_immigration_policy');
        if (content.includes('president sanctions'))
            factors.push('president_sanctions_policy');
        if (content.includes('president election') || content.includes('president campaign'))
            factors.push('president_election_impact');
        if (content.includes('white house') || content.includes('oval office'))
            factors.push('presidential_institution');
        if (content.includes('presidential order') || content.includes('executive order'))
            factors.push('presidential_executive_action');
        if (content.includes('election'))
            factors.push('political_relevance');
        if (content.includes('war') || content.includes('conflict'))
            factors.push('global_conflict');
        if (content.includes('sanctions'))
            factors.push('international_sanctions');
        if (content.includes('nato') || content.includes('china') || content.includes('russia'))
            factors.push('international_politics');
        if (content.includes('immigration'))
            factors.push('immigration_policy');
        if (content.includes('crypto') || content.includes('bitcoin'))
            factors.push('crypto_relevance');
        if (content.includes('sec') || content.includes('cftc'))
            factors.push('crypto_regulation');
        if (content.includes('etf'))
            factors.push('crypto_etf');
        if (content.includes('institutional'))
            factors.push('institutional_adoption');
        if (content.includes('economy'))
            factors.push('economic_impact');
        if (content.includes('fed') || content.includes('interest rates'))
            factors.push('monetary_policy');
        if (content.includes('ai'))
            factors.push('tech_relevance');
        if (content.includes('cybersecurity'))
            factors.push('cybersecurity_impact');
        return factors;
    }
    getCacheKey() {
        const now = new Date();
        const battleDurationHours = parseFloat(process.env.BATTLE_DURATION_HOURS || '4');
        const battleDurationMs = battleDurationHours * 60 * 60 * 1000;
        const battleCycleStart = Math.floor(now.getTime() / battleDurationMs) * battleDurationMs;
        const battleCycleId = Math.floor(battleCycleStart / battleDurationMs);
        return `battle_topic_${battleCycleId}`;
    }
    isCacheValid(timestamp) {
        const now = new Date();
        const cacheAge = now.getTime() - timestamp.getTime();
        return cacheAge < this.cacheTimeout;
    }
}
exports.default = NewsCuratorAgent;
