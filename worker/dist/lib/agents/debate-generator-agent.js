"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const base_agent_1 = __importDefault(require("./base-agent"));
class DebateGeneratorAgent extends base_agent_1.default {
    constructor(apiKey) {
        super('Debate Generator', 'Topic Analysis & Argument Creation', apiKey);
    }
    async generateDebateTopic(curatedTopic) {
        this.logActivity('Starting debate topic generation', {
            articleTitle: curatedTopic.title,
            category: curatedTopic.category
        });
        try {
            const prompt = this.createDebatePrompt(curatedTopic);
            const schema = this.getDebateSchema();
            const result = await this.generateStructuredContent(prompt, schema, 0.8);
            if (!result.success || !result.data) {
                throw new Error('Failed to generate debate topic');
            }
            if (!result.data.title || !result.data.description || !result.data.category || !result.data.debatePoints) {
                throw new Error('Invalid debate topic generated');
            }
            const debateTopic = {
                ...result.data,
                source: curatedTopic.source,
                articleUrl: curatedTopic.articleUrl,
                articleTitle: curatedTopic.title,
                engagementScore: curatedTopic.engagementScore,
                relevanceFactors: curatedTopic.relevanceFactors,
                imageUrl: curatedTopic.imageUrl,
                thumbnail: curatedTopic.thumbnail,
                generatedBy: this.name,
                generatedAt: new Date().toISOString(),
                originalTopic: curatedTopic
            };
            this.logActivity('Successfully generated debate topic', {
                title: debateTopic.title,
                category: debateTopic.category,
                argumentCount: Object.keys(debateTopic.debatePoints).length
            });
            return debateTopic;
        }
        catch (error) {
            this.logActivity('Error generating debate topic', { error: error.message });
            throw error;
        }
    }
    createDebatePrompt(curatedTopic) {
        return `You are an expert debate moderator and content creator specializing in creating engaging, balanced debates for social media platforms.

TASK: Create a compelling debate topic based on this trending news article:

ARTICLE DETAILS:
- Title: "${curatedTopic.title}"
- Description: "${curatedTopic.description || 'No description available'}"
- Source: "${curatedTopic.source}"
- Category: "${curatedTopic.category}"
- Engagement Score: ${curatedTopic.engagementScore}/100
- Relevance Factors: ${curatedTopic.relevanceFactors?.join(', ') || 'None'}

REQUIREMENTS:
1. Create a clear, engaging debate question (max 100 characters)
2. Write a concise description explaining the context (max 200 characters)
3. Generate two opposing sides with 3-4 compelling arguments each
4. Ensure arguments are balanced, factual, and respectful
5. Focus on the most controversial or important aspects
6. Make it engaging for social media users
7. Avoid extreme or inflammatory language

DEBATE QUALITY STANDARDS:
- Arguments should be substantive and well-reasoned
- Both sides should have legitimate points
- Avoid strawman arguments or oversimplification
- Use clear, accessible language
- Focus on policy, impact, and consequences
- Ensure arguments are relevant to the news topic

Generate a debate topic that will spark meaningful discussion and engagement.`;
    }
    getDebateSchema() {
        return zod_1.z.object({
            title: zod_1.z.string().describe('A clear, engaging debate question (max 100 characters)'),
            description: zod_1.z.string().describe('Brief context about the issue (max 200 characters)'),
            category: zod_1.z.string().describe('Category like politics/crypto/technology/economy/etc'),
            debatePoints: zod_1.z.object({
                Support: zod_1.z.array(zod_1.z.string()).describe('3-4 compelling arguments supporting one side'),
                Oppose: zod_1.z.array(zod_1.z.string()).describe('3-4 compelling arguments opposing the same side')
            }).describe('Two opposing sides with key arguments'),
            complexity: zod_1.z.enum(['simple', 'moderate', 'complex']).describe('Complexity level of the debate topic'),
            controversyLevel: zod_1.z.enum(['low', 'medium', 'high']).describe('Level of controversy expected'),
            targetAudience: zod_1.z.enum(['general', 'informed', 'expert']).describe('Target audience for the debate')
        });
    }
    async generateDebateVariations(originalTopic, count = 2) {
        this.logActivity('Generating debate variations', {
            originalTitle: originalTopic.title,
            variationCount: count
        });
        try {
            const variations = [];
            for (let i = 0; i < count; i++) {
                const prompt = this.createVariationPrompt(originalTopic, i + 1);
                const schema = this.getDebateSchema();
                const result = await this.generateStructuredContent(prompt, schema, 0.9);
                if (this.validateResponse(result, ['title', 'description', 'category', 'debatePoints'])) {
                    variations.push({
                        ...result.data,
                        variationNumber: i + 1,
                        originalTopicId: originalTopic.id,
                        generatedBy: this.name,
                        generatedAt: new Date().toISOString()
                    });
                }
            }
            this.logActivity('Successfully generated debate variations', {
                requested: count,
                generated: variations.length
            });
            return variations;
        }
        catch (error) {
            this.logActivity('Error generating debate variations', { error: error.message });
            throw error;
        }
    }
    createVariationPrompt(originalTopic, variationNumber) {
        return `Create an alternative debate topic based on the same news article, but with a different angle or focus.

ORIGINAL DEBATE:
- Title: "${originalTopic.title}"
- Description: "${originalTopic.description}"
- Category: "${originalTopic.category}"

ARTICLE CONTEXT:
- Title: "${originalTopic.articleTitle}"
- Source: "${originalTopic.source}"

TASK: Create variation #${variationNumber} that:
1. Uses the same news article as source material
2. Takes a different angle or perspective
3. Focuses on different aspects or implications
4. Maintains the same quality standards
5. Is distinct from the original debate topic

Generate a fresh debate topic that explores different dimensions of the same news story.`;
    }
    async analyzeDebateQuality(debateTopic) {
        this.logActivity('Analyzing debate quality', { title: debateTopic.title });
        try {
            const prompt = this.createQualityAnalysisPrompt(debateTopic) + '\n\nPlease respond with valid JSON in this exact format:\n{\n  "overallScore": 1-10,\n  "balanceScore": 1-10,\n  "clarityScore": 1-10,\n  "engagementScore": 1-10,\n  "strengths": ["strength1", "strength2"],\n  "weaknesses": ["weakness1", "weakness2"],\n  "recommendations": ["recommendation1", "recommendation2"],\n  "summary": "brief analysis summary"\n}';
            const result = await this.generateTextContent(prompt, 0.3);
            if (!result.success || !result.data) {
                throw new Error('Failed to generate quality analysis');
            }
            let parsedData;
            try {
                const jsonMatch = result.data.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON found in response');
                }
                parsedData = JSON.parse(jsonMatch[0]);
            }
            catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Raw response:', result.data);
                throw new Error('Failed to parse AI response as JSON');
            }
            if (!parsedData.overallScore || !parsedData.balanceScore || !parsedData.clarityScore || !parsedData.engagementScore) {
                throw new Error('Invalid quality analysis generated');
            }
            const analysis = {
                ...parsedData,
                analyzedAt: new Date().toISOString(),
                analyzedBy: this.name,
                debateTopicId: debateTopic.id
            };
            this.logActivity('Successfully analyzed debate quality', {
                overallScore: analysis.overallScore,
                balanceScore: analysis.balanceScore
            });
            return analysis;
        }
        catch (error) {
            this.logActivity('Error analyzing debate quality', { error: error.message });
            throw error;
        }
    }
    createQualityAnalysisPrompt(debateTopic) {
        return `Analyze the quality of this debate topic for social media engagement:

DEBATE TOPIC:
- Title: "${debateTopic.title}"
- Description: "${debateTopic.description}"
- Category: "${debateTopic.category}"

DEBATE POINTS:
${Object.entries(debateTopic.debatePoints).map(([side, points]) => `${side}: ${points.map(p => `• ${p}`).join('\n')}`).join('\n\n')}

EVALUATE ON THESE CRITERIA:
1. Overall Quality (1-10): How well-crafted is this debate topic?
2. Balance (1-10): Are both sides fairly represented?
3. Clarity (1-10): Is the topic clear and understandable?
4. Engagement Potential (1-10): Will this spark meaningful discussion?
5. Controversy Level (1-10): How controversial is this topic?
6. Accessibility (1-10): How accessible is this to general audience?

Provide specific feedback and suggestions for improvement.`;
    }
    getQualityAnalysisSchema() {
        return {
            type: 'object',
            properties: {
                overallScore: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Overall quality score (1-10)'
                },
                balanceScore: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Balance between sides score (1-10)'
                },
                clarityScore: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Clarity and understandability score (1-10)'
                },
                engagementScore: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Engagement potential score (1-10)'
                },
                controversyLevel: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Controversy level score (1-10)'
                },
                accessibilityScore: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Accessibility to general audience score (1-10)'
                },
                strengths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of strengths in this debate topic'
                },
                weaknesses: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of weaknesses or areas for improvement'
                },
                suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific suggestions for improvement'
                }
            },
            required: ['overallScore', 'balanceScore', 'clarityScore', 'engagementScore', 'controversyLevel', 'accessibilityScore', 'strengths', 'weaknesses', 'suggestions']
        };
    }
}
exports.default = DebateGeneratorAgent;
