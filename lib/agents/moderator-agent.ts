// lib/agents/moderator-agent.js
import BaseAgent from './base-agent';

class ModeratorAgent extends BaseAgent {
  constructor(apiKey) {
    super('Moderator', 'Content Quality & Safety Assessment', apiKey);
  }

  // Main method: Moderate cast content for quality and appropriateness
  async moderateCast(castContent, battleTopic) {
    this.logActivity('Starting cast moderation', {
      castLength: castContent.length,
      battleTitle: battleTopic.title
    });

    try {
      const prompt = this.createModerationPrompt(castContent, battleTopic) + '\n\nPlease respond with valid JSON in this exact format:\n{\n  "isAppropriate": true/false,\n  "qualityScore": 1-10,\n  "relevanceScore": 1-10,\n  "engagementScore": 1-10,\n  "violations": ["violation1", "violation2"],\n  "strengths": ["strength1", "strength2"],\n  "weaknesses": ["weakness1", "weakness2"],\n  "feedback": "constructive feedback here",\n  "recommendation": "approve|reject|flag"\n}';

      const result = await this.generateTextContent(prompt, 0.3);

      if (!result.success || !result.data) {
        throw new Error('Failed to generate moderation result');
      }

      // Parse JSON response
      let parsedData;
      try {
        // Extract JSON from response
        const jsonMatch = result.data.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw response:', result.data);
        throw new Error('Failed to parse AI response as JSON');
      }

      if (parsedData.isAppropriate === undefined || !parsedData.qualityScore || !parsedData.relevanceScore) {
        throw new Error('Invalid moderation result generated');
      }

      const moderation = {
        ...parsedData,
        castContent: castContent.substring(0, 100) + '...', // Store truncated version
        battleTopicId: battleTopic.id,
        moderatedBy: this.name,
        moderatedAt: new Date().toISOString()
      };

      this.logActivity('Successfully moderated cast', {
        isAppropriate: moderation.isAppropriate,
        qualityScore: moderation.qualityScore,
        relevanceScore: moderation.relevanceScore
      });

      return moderation;

    } catch (error) {
      this.logActivity('Error moderating cast', { error: error.message });
      throw error;
    }
  }

  // Batch moderate multiple casts (for battle completion)
  async moderateBattleCasts(casts, battleTopic) {
    this.logActivity('Starting batch cast moderation', {
      castCount: casts.length,
      battleTitle: battleTopic.title
    });

    try {
      const moderationResults = [];
      
      for (const cast of casts) {
        try {
          const moderation = await this.moderateCast(cast.content, battleTopic);
          moderationResults.push({
            ...moderation,
            castId: cast.id,
            userId: cast.userId,
            submittedAt: cast.submittedAt
          });
        } catch (error) {
          console.error(`Error moderating cast ${cast.id}:`, error);
          // Add failed moderation with default values
          moderationResults.push({
            castId: cast.id,
            userId: cast.userId,
            isAppropriate: false,
            qualityScore: 0,
            relevanceScore: 0,
            violations: ['moderation_failed'],
            feedback: 'Failed to moderate cast',
            moderatedBy: this.name,
            moderatedAt: new Date().toISOString(),
            error: error.message
          });
        }
      }

      const summary = this.generateModerationSummary(moderationResults);
      
      this.logActivity('Completed batch cast moderation', {
        totalCasts: casts.length,
        moderatedCasts: moderationResults.length,
        appropriateCasts: summary.appropriateCount,
        averageQuality: summary.averageQuality
      });

      return {
        results: moderationResults,
        summary: summary,
        moderatedBy: this.name,
        moderatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logActivity('Error in batch cast moderation', { error: error.message });
      throw error;
    }
  }

  // Create moderation prompt
  createModerationPrompt(castContent, battleTopic) {
    return `You are a content moderator for a social media debate platform. Your job is to assess cast content for quality, appropriateness, and relevance.

BATTLE TOPIC:
- Title: "${battleTopic.title}"
- Description: "${battleTopic.description}"
- Category: "${battleTopic.category}"

CAST CONTENT TO MODERATE:
"${castContent}"

MODERATION CRITERIA:

1. APPROPRIATENESS (Required):
   - No hate speech, harassment, or personal attacks
   - No spam, off-topic content, or promotional material
   - No misinformation or false claims
   - No inappropriate language or content
   - Respectful tone and constructive arguments

2. QUALITY (1-10):
   - Well-reasoned arguments with supporting evidence
   - Clear, coherent writing
   - Original thought and perspective
   - Appropriate length and depth
   - Engaging and thought-provoking content

3. RELEVANCE (1-10):
   - Directly addresses the battle topic
   - Stays on topic and doesn't go off on tangents
   - Contributes meaningfully to the debate
   - Shows understanding of the topic
   - Provides relevant insights or arguments

4. ENGAGEMENT POTENTIAL (1-10):
   - Likely to spark discussion and responses
   - Interesting or controversial points
   - Encourages further debate
   - Adds value to the conversation

ASSESSMENT GUIDELINES:
- Be fair and objective in your evaluation
- Consider the context of social media debate
- Focus on constructive criticism
- Identify specific issues and provide actionable feedback
- Reward quality content and thoughtful arguments

Provide a comprehensive moderation assessment.`;
  }

  // Define moderation schema
  getModerationSchema() {
    return {
      type: 'object',
      properties: {
        isAppropriate: {
          type: 'boolean',
          description: 'Whether the cast is appropriate for the platform'
        },
        qualityScore: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Quality score (1-10) based on reasoning, clarity, and depth'
        },
        relevanceScore: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Relevance score (1-10) based on topic alignment'
        },
        engagementScore: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Engagement potential score (1-10)'
        },
        violations: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of policy violations found (empty if none)'
        },
        strengths: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of strengths in the cast content'
        },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of weaknesses or areas for improvement'
        },
        feedback: {
          type: 'string',
          description: 'Constructive feedback for the user'
        },
        recommendation: {
          type: 'string',
          enum: ['approve', 'reject', 'flag_for_review'],
          description: 'Moderation recommendation'
        }
      },
      required: ['isAppropriate', 'qualityScore', 'relevanceScore', 'engagementScore', 'violations', 'strengths', 'weaknesses', 'feedback', 'recommendation']
    };
  }

  // Generate moderation summary
  generateModerationSummary(results) {
    const appropriateCasts = results.filter(r => r.isAppropriate);
    const totalQuality = results.reduce((sum, r) => sum + (r.qualityScore || 0), 0);
    const totalRelevance = results.reduce((sum, r) => sum + (r.relevanceScore || 0), 0);
    const totalEngagement = results.reduce((sum, r) => sum + (r.engagementScore || 0), 0);

    return {
      totalCasts: results.length,
      appropriateCount: appropriateCasts.length,
      inappropriateCount: results.length - appropriateCasts.length,
      averageQuality: totalQuality / results.length,
      averageRelevance: totalRelevance / results.length,
      averageEngagement: totalEngagement / results.length,
      topViolations: this.getTopViolations(results),
      qualityDistribution: this.getQualityDistribution(results),
      recommendations: this.getModerationRecommendations(results)
    };
  }

  // Get top policy violations
  getTopViolations(results) {
    const violations = {};
    results.forEach(result => {
      result.violations?.forEach(violation => {
        violations[violation] = (violations[violation] || 0) + 1;
      });
    });

    return Object.entries(violations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([violation, count]) => ({ violation, count }));
  }

  // Get quality distribution
  getQualityDistribution(results) {
    const distribution = { '1-3': 0, '4-6': 0, '7-8': 0, '9-10': 0 };
    
    results.forEach(result => {
      const score = result.qualityScore || 0;
      if (score <= 3) distribution['1-3']++;
      else if (score <= 6) distribution['4-6']++;
      else if (score <= 8) distribution['7-8']++;
      else distribution['9-10']++;
    });

    return distribution;
  }

  // Get moderation recommendations
  getModerationRecommendations(results) {
    const recommendations = [];
    
    const lowQualityCount = results.filter(r => (r.qualityScore || 0) < 5).length;
    const lowRelevanceCount = results.filter(r => (r.relevanceScore || 0) < 5).length;
    const inappropriateCount = results.filter(r => !r.isAppropriate).length;

    if (lowQualityCount > results.length * 0.3) {
      recommendations.push('Consider providing clearer guidelines for cast quality');
    }
    
    if (lowRelevanceCount > results.length * 0.3) {
      recommendations.push('Consider improving topic clarity or user education');
    }
    
    if (inappropriateCount > results.length * 0.1) {
      recommendations.push('Consider strengthening community guidelines');
    }

    return recommendations;
  }

  // Analyze moderation patterns
  async analyzeModerationPatterns(moderationHistory) {
    this.logActivity('Analyzing moderation patterns', {
      historyLength: moderationHistory.length
    });

    try {
      const prompt = this.createPatternAnalysisPrompt(moderationHistory);
      const schema = this.getPatternAnalysisSchema();

      const result = await this.generateStructuredContent(prompt, schema, 0.4);

      if (!this.validateResponse(result, ['insights', 'recommendations'])) {
        throw new Error('Invalid pattern analysis generated');
      }

      const analysis = {
        ...result.data,
        analyzedAt: new Date().toISOString(),
        analyzedBy: this.name,
        historyLength: moderationHistory.length
      };

      this.logActivity('Successfully analyzed moderation patterns', {
        insightCount: analysis.insights.length,
        recommendationCount: analysis.recommendations.length
      });

      return analysis;

    } catch (error) {
      this.logActivity('Error analyzing moderation patterns', { error: error.message });
      throw error;
    }
  }

  // Create pattern analysis prompt
  createPatternAnalysisPrompt(moderationHistory) {
    const summary = this.generateModerationSummary(moderationHistory);
    
    return `Analyze moderation patterns from this batch of cast moderations:

MODERATION SUMMARY:
- Total Casts: ${summary.totalCasts}
- Appropriate Casts: ${summary.appropriateCount}
- Inappropriate Casts: ${summary.inappropriateCount}
- Average Quality: ${summary.averageQuality.toFixed(2)}/10
- Average Relevance: ${summary.averageRelevance.toFixed(2)}/10
- Average Engagement: ${summary.averageEngagement.toFixed(2)}/10

TOP VIOLATIONS:
${summary.topViolations.map(v => `- ${v.violation}: ${v.count} occurrences`).join('\n')}

QUALITY DISTRIBUTION:
- Low Quality (1-3): ${summary.qualityDistribution['1-3']} casts
- Medium Quality (4-6): ${summary.qualityDistribution['4-6']} casts
- High Quality (7-8): ${summary.qualityDistribution['7-8']} casts
- Excellent Quality (9-10): ${summary.qualityDistribution['9-10']} casts

ANALYSIS TASK:
1. Identify patterns in content quality and violations
2. Suggest improvements for community guidelines
3. Recommend moderation policy adjustments
4. Provide insights for user education

Focus on actionable insights that can improve the overall quality of debates.`;
  }

  // Define pattern analysis schema
  getPatternAnalysisSchema() {
    return {
      type: 'object',
      properties: {
        insights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key insights about moderation patterns'
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Actionable recommendations for improvement'
        },
        policySuggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggestions for moderation policy updates'
        },
        userEducationNeeds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Areas where users need better education'
        }
      },
      required: ['insights', 'recommendations', 'policySuggestions', 'userEducationNeeds']
    };
  }
}

export default ModeratorAgent;
