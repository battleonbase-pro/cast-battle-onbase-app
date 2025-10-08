// lib/agents/base-agent.js
import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';

class BaseAgent {
  constructor(name, role, apiKey) {
    this.name = name;
    this.role = role;
    this.apiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.model = 'gemini-2.0-flash';
  }

  // Generate structured content using schema
  async generateStructuredContent(prompt, schema, temperature = 0.7) {
    try {
      const { object } = await generateObject({
        model: google(this.model, {
          apiKey: this.apiKey,
        }),
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
    } catch (error) {
      console.error(`${this.name} error:`, error);
      return {
        success: false,
        error: error.message,
        agent: this.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Generate text content
  async generateTextContent(prompt, temperature = 0.7) {
    try {
      const { text } = await generateText({
        model: google(this.model, {
          apiKey: this.apiKey,
        }),
        prompt,
        temperature,
      });

      return {
        success: true,
        data: text,
        agent: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`${this.name} error:`, error);
      return {
        success: false,
        error: error.message,
        agent: this.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Log agent activity
  logActivity(action, details = {}) {
    console.log(`[${this.name}] ${action}:`, {
      role: this.role,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Validate agent response
  validateResponse(response, requiredFields = []) {
    if (!response.success) {
      return false;
    }

    if (requiredFields.length > 0 && response.data) {
      return requiredFields.every(field => 
        response.data.hasOwnProperty(field) && 
        response.data[field] !== null && 
        response.data[field] !== undefined
      );
    }

    return true;
  }
}

export default BaseAgent;
