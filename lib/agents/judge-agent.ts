// lib/agents/judge-agent.js
import BaseAgent from './base-agent';

class JudgeAgent extends BaseAgent {
  constructor(apiKey) {
    super('Judge', 'Battle Outcome Determination', apiKey);
  }

  // Main method: Determine battle winner based on multiple criteria
  async judgeBattle(battleData, casts, moderationResults, winnerMethod = 'hybrid') {
    this.logActivity('Starting battle judgment', {
      battleId: battleData.id,
      castCount: casts.length,
      winnerMethod: winnerMethod
    });

    try {
      // Filter appropriate casts based on moderation
      const appropriateCasts = casts.filter(cast => {
        const moderation = moderationResults.find(m => m.castId === cast.id);
        return moderation && moderation.isAppropriate;
      });

      if (appropriateCasts.length === 0) {
        throw new Error('No appropriate casts found for judging');
      }

      // Apply winner selection method
      let winner;
      let judgmentDetails;

      switch (winnerMethod) {
        case 'random':
          winner = this.selectRandomWinner(appropriateCasts);
          judgmentDetails = await this.generateRandomJudgment(battleData, appropriateCasts, winner);
          break;
        
        case 'votes':
          winner = this.selectVoteWinner(appropriateCasts);
          judgmentDetails = await this.generateVoteJudgment(battleData, appropriateCasts, winner);
          break;
        
        case 'quality':
          winner = await this.selectQualityWinner(battleData, appropriateCasts, moderationResults);
          judgmentDetails = await this.generateQualityJudgment(battleData, appropriateCasts, winner);
          break;
        
        case 'hybrid':
        default:
          winner = await this.selectHybridWinner(battleData, appropriateCasts, moderationResults);
          judgmentDetails = await this.generateHybridJudgment(battleData, appropriateCasts, winner);
          break;
      }

      const judgment = {
        battleId: battleData.id,
        winner: winner,
        judgmentDetails: judgmentDetails,
        castCount: casts.length,
        appropriateCastCount: appropriateCasts.length,
        winnerMethod: winnerMethod,
        judgedBy: this.name,
        judgedAt: new Date().toISOString()
      };

      this.logActivity('Successfully completed battle judgment', {
        winnerId: winner.id,
        winnerMethod: winnerMethod,
        appropriateCasts: appropriateCasts.length
      });

      return judgment;

    } catch (error) {
      this.logActivity('Error judging battle', { error: error.message });
      throw error;
    }
  }

  // Select random winner from appropriate casts
  selectRandomWinner(casts) {
    const randomIndex = Math.floor(Math.random() * casts.length);
    return {
      ...casts[randomIndex],
      selectionMethod: 'random',
      selectionReason: 'Random selection from appropriate casts'
    };
  }

  // Select winner based on votes (if voting system is implemented)
  selectVoteWinner(casts) {
    // For now, simulate vote-based selection
    // In a real implementation, this would query actual vote data
    const castsWithVotes = casts.map(cast => ({
      ...cast,
      voteCount: Math.floor(Math.random() * 50) + 1 // Simulated votes
    }));

    const winner = castsWithVotes.reduce((prev, current) => 
      (prev.voteCount > current.voteCount) ? prev : current
    );

    return {
      ...winner,
      selectionMethod: 'votes',
      selectionReason: `Selected based on ${winner.voteCount} votes`
    };
  }

  // Select winner based on quality analysis
  async selectQualityWinner(battleData, casts, moderationResults) {
    this.logActivity('Analyzing cast quality for winner selection');

    try {
      const prompt = this.createQualityAnalysisPrompt(battleData, casts, moderationResults);
      const schema = this.getQualityAnalysisSchema();

      const result = await this.generateStructuredContent(prompt, schema, 0.4);

      if (!this.validateResponse(result, ['winner', 'reasoning'])) {
        throw new Error('Invalid quality analysis generated');
      }

      const winnerCast = casts.find(cast => cast.id === result.data.winner.castId);
      if (!winnerCast) {
        throw new Error('Winner cast not found');
      }

      return {
        ...winnerCast,
        selectionMethod: 'quality',
        selectionReason: result.data.reasoning,
        qualityScore: result.data.winner.qualityScore,
        analysisDetails: result.data
      };

    } catch (error) {
      this.logActivity('Error in quality winner selection', { error: error.message });
      // Fallback to random selection
      return this.selectRandomWinner(casts);
    }
  }

  // Select winner using hybrid approach (quality + engagement + relevance)
  async selectHybridWinner(battleData, casts, moderationResults) {
    this.logActivity('Analyzing casts using hybrid approach');

    try {
      const availableCastIds = casts.map(cast => cast.id).join(', ');
      const prompt = this.createHybridAnalysisPrompt(battleData, casts, moderationResults) + `\n\nAvailable cast IDs: ${availableCastIds}\n\nPlease respond with valid JSON in this exact format:\n{\n  "winner": {\n    "castId": "MUST be one of: ${availableCastIds}",\n    "reasoning": "explanation here"\n  },\n  "scoring": {\n    "qualityWeight": 0.4,\n    "engagementWeight": 0.3,\n    "relevanceWeight": 0.3\n  },\n  "analysis": "detailed analysis here"\n}`;

      const result = await this.generateTextContent(prompt, 0.5);

      if (!result.success || !result.data) {
        throw new Error('Failed to generate hybrid analysis');
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

      if (!parsedData.winner || !parsedData.winner.castId) {
        throw new Error('Invalid hybrid analysis generated');
      }

      const winnerCast = casts.find(cast => cast.id === parsedData.winner.castId);
      if (!winnerCast) {
        console.warn(`AI selected invalid cast ID: ${parsedData.winner.castId}. Available IDs: ${availableCastIds}. Falling back to random selection.`);
        return this.selectRandomWinner(casts);
      }

      return {
        ...winnerCast,
        selectionMethod: 'hybrid',
        selectionReason: parsedData.winner.reasoning,
        hybridScore: parsedData.winner.totalScore || 0,
        scoringBreakdown: parsedData.scoring,
        analysisDetails: parsedData
      };

    } catch (error) {
      this.logActivity('Error in hybrid winner selection', { error: error.message });
      // Fallback to random selection
      return this.selectRandomWinner(casts);
    }
  }

  // Generate judgment details for random selection
  async generateRandomJudgment(battleData, casts, winner) {
    const prompt = `Generate a judgment summary for a randomly selected winner in a debate battle.

BATTLE TOPIC: "${battleData.title}"
WINNER CAST: "${winner.content.substring(0, 200)}..."
TOTAL PARTICIPANTS: ${casts.length}

Create a fair and encouraging judgment that explains the random selection process and celebrates all participants.`;

    const result = await this.generateTextContent(prompt, 0.6);
    
    return {
      method: 'random',
      summary: result.data,
      fairness: 'Random selection ensures equal opportunity for all participants',
      transparency: 'Selection process is transparent and verifiable'
    };
  }

  // Generate judgment details for vote-based selection
  async generateVoteJudgment(battleData, casts, winner) {
    const prompt = `Generate a judgment summary for a vote-based winner in a debate battle.

BATTLE TOPIC: "${battleData.title}"
WINNER CAST: "${winner.content.substring(0, 200)}..."
WINNER VOTES: ${winner.voteCount}
TOTAL PARTICIPANTS: ${casts.length}

Create a judgment that celebrates the democratic process and the winner's popularity.`;

    const result = await this.generateTextContent(prompt, 0.6);
    
    return {
      method: 'votes',
      summary: result.data,
      democracy: 'Winner selected by community vote',
      engagement: 'High community engagement in the voting process'
    };
  }

  // Generate judgment details for quality-based selection
  async generateQualityJudgment(battleData, casts, winner) {
    const prompt = `Generate a judgment summary for a quality-based winner in a debate battle.

BATTLE TOPIC: "${battleData.title}"
WINNER CAST: "${winner.content.substring(0, 200)}..."
QUALITY SCORE: ${winner.qualityScore}/10
TOTAL PARTICIPANTS: ${casts.length}

Create a judgment that highlights the winner's exceptional content quality and thoughtful arguments.`;

    const result = await this.generateTextContent(prompt, 0.6);
    
    return {
      method: 'quality',
      summary: result.data,
      excellence: 'Winner selected for exceptional content quality',
      merit: 'Selection based on substantive arguments and clear reasoning'
    };
  }

  // Generate judgment details for hybrid selection
  async generateHybridJudgment(battleData, casts, winner) {
    const prompt = `Generate a judgment summary for a hybrid-selected winner in a debate battle.

BATTLE TOPIC: "${battleData.title}"
WINNER CAST: "${winner.content.substring(0, 200)}..."
HYBRID SCORE: ${winner.hybridScore}/100
TOTAL PARTICIPANTS: ${casts.length}

Create a comprehensive judgment that explains the multi-factor evaluation process and celebrates the winner's balanced excellence.`;

    const result = await this.generateTextContent(prompt, 0.6);
    
    return {
      method: 'hybrid',
      summary: result.data,
      comprehensive: 'Winner selected using multiple evaluation criteria',
      balanced: 'Selection considers quality, engagement, and relevance'
    };
  }

  // Create quality analysis prompt
  createQualityAnalysisPrompt(battleData, casts, moderationResults) {
    const castsWithScores = casts.map(cast => {
      const moderation = moderationResults.find(m => m.castId === cast.id);
      return {
        castId: cast.id,
        content: cast.content.substring(0, 300) + '...',
        qualityScore: moderation?.qualityScore || 0,
        relevanceScore: moderation?.relevanceScore || 0,
        engagementScore: moderation?.engagementScore || 0
      };
    });

    return `Analyze the quality of debate casts and select the best one based on content quality, argument strength, and engagement.

BATTLE TOPIC: "${battleData.title}"
BATTLE DESCRIPTION: "${battleData.description}"

CASTS TO EVALUATE:
${castsWithScores.map((cast, index) => `
Cast ${index + 1}:
- Content: "${cast.content}"
- Quality Score: ${cast.qualityScore}/10
- Relevance Score: ${cast.relevanceScore}/10
- Engagement Score: ${cast.engagementScore}/10
`).join('\n')}

EVALUATION CRITERIA:
1. Argument Quality: Well-reasoned, evidence-based arguments
2. Relevance: Directly addresses the battle topic
3. Clarity: Clear, understandable writing
4. Originality: Unique perspective or insights
5. Engagement: Likely to spark discussion

Select the cast that best demonstrates these qualities and provide detailed reasoning.`;
  }

  // Define quality analysis schema
  getQualityAnalysisSchema() {
    return {
      type: 'object',
      properties: {
        winner: {
          type: 'object',
          properties: {
            castId: { type: 'string' },
            qualityScore: { type: 'number', minimum: 1, maximum: 10 },
            reasoning: { type: 'string' }
          },
          required: ['castId', 'qualityScore', 'reasoning']
        },
        evaluation: {
          type: 'object',
          properties: {
            criteria: { type: 'array', items: { type: 'string' } },
            strengths: { type: 'array', items: { type: 'string' } },
            areasForImprovement: { type: 'array', items: { type: 'string' } }
          },
          required: ['criteria', 'strengths', 'areasForImprovement']
        }
      },
      required: ['winner', 'evaluation']
    };
  }

  // Create hybrid analysis prompt
  createHybridAnalysisPrompt(battleData, casts, moderationResults) {
    const castsWithScores = casts.map(cast => {
      const moderation = moderationResults.find(m => m.castId === cast.id);
      return {
        castId: cast.id,
        content: cast.content.substring(0, 300) + '...',
        qualityScore: moderation?.qualityScore || 0,
        relevanceScore: moderation?.relevanceScore || 0,
        engagementScore: moderation?.engagementScore || 0
      };
    });

    return `Analyze debate casts using a hybrid approach that considers multiple factors: quality, engagement, relevance, and overall impact.

BATTLE TOPIC: "${battleData.title}"
BATTLE DESCRIPTION: "${battleData.description}"

CASTS TO EVALUATE:
${castsWithScores.map((cast, index) => `
Cast ${index + 1}:
- Content: "${cast.content}"
- Quality Score: ${cast.qualityScore}/10
- Relevance Score: ${cast.relevanceScore}/10
- Engagement Score: ${cast.engagementScore}/10
`).join('\n')}

HYBRID SCORING CRITERIA (Weighted):
1. Content Quality (40%): Argument strength, clarity, evidence
2. Relevance (30%): Topic alignment, staying on point
3. Engagement (20%): Discussion potential, controversy level
4. Originality (10%): Unique insights, fresh perspective

Calculate weighted scores and select the winner. Provide detailed scoring breakdown.`;
  }

  // Define hybrid analysis schema
  getHybridAnalysisSchema() {
    return {
      type: 'object',
      properties: {
        winner: {
          type: 'object',
          properties: {
            castId: { type: 'string' },
            totalScore: { type: 'number', minimum: 0, maximum: 100 },
            reasoning: { type: 'string' }
          },
          required: ['castId', 'totalScore', 'reasoning']
        },
        scoring: {
          type: 'object',
          properties: {
            criteria: {
              type: 'object',
              properties: {
                quality: { type: 'number', minimum: 0, maximum: 40 },
                relevance: { type: 'number', minimum: 0, maximum: 30 },
                engagement: { type: 'number', minimum: 0, maximum: 20 },
                originality: { type: 'number', minimum: 0, maximum: 10 }
              }
            },
            explanation: { type: 'string' }
          },
          required: ['criteria', 'explanation']
        }
      },
      required: ['winner', 'scoring']
    };
  }

  // Generate battle statistics
  async generateBattleStatistics(battleData, casts, moderationResults, judgment) {
    this.logActivity('Generating battle statistics');

    try {
      const stats = {
        battleId: battleData.id,
        totalParticipants: casts.length,
        appropriateCasts: moderationResults.filter(m => m.isAppropriate).length,
        averageQuality: moderationResults.reduce((sum, m) => sum + m.qualityScore, 0) / moderationResults.length,
        averageRelevance: moderationResults.reduce((sum, m) => sum + m.relevanceScore, 0) / moderationResults.length,
        averageEngagement: moderationResults.reduce((sum, m) => sum + m.engagementScore, 0) / moderationResults.length,
        winnerMethod: judgment.winnerMethod,
        winnerCastId: judgment.winner.castId,
        generatedAt: new Date().toISOString()
      };

      this.logActivity('Successfully generated battle statistics', {
        totalParticipants: stats.totalParticipants,
        averageQuality: stats.averageQuality.toFixed(2)
      });

      return stats;

    } catch (error) {
      this.logActivity('Error generating battle statistics', { error: error.message });
      throw error;
    }
  }
}

export default JudgeAgent;
