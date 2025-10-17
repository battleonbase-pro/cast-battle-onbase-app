"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
class BaseAgent {
    constructor(name, role, apiKey) {
        this.name = name;
        this.role = role;
        this.apiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
        this.model = 'gemini-2.0-flash';
    }
    async generateStructuredContent(prompt, schema, temperature = 0.7) {
        try {
            const { object } = await (0, ai_1.generateObject)({
                model: (0, google_1.google)(this.model),
                prompt,
                schema,
                temperature,
            });
            return {
                success: true,
                data: object,
                agent: this.name,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error(`${this.name} error:`, error);
            return {
                success: false,
                error: error.message,
                agent: this.name,
                timestamp: new Date().toISOString()
            };
        }
    }
    async generateTextContent(prompt, temperature = 0.7) {
        try {
            const { text } = await (0, ai_1.generateText)({
                model: (0, google_1.google)(this.model),
                prompt,
                temperature,
            });
            return {
                success: true,
                data: text,
                agent: this.name,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error(`${this.name} error:`, error);
            return {
                success: false,
                error: error.message,
                agent: this.name,
                timestamp: new Date().toISOString()
            };
        }
    }
    logActivity(action, details = {}) {
        console.log(`[${this.name}] ${action}:`, {
            role: this.role,
            timestamp: new Date().toISOString(),
            ...details
        });
    }
    validateResponse(response, requiredFields = []) {
        if (!response.success) {
            return false;
        }
        if (requiredFields.length > 0 && response.data) {
            return requiredFields.every(field => response.data.hasOwnProperty(field) &&
                response.data[field] !== null &&
                response.data[field] !== undefined);
        }
        return true;
    }
}
exports.default = BaseAgent;
