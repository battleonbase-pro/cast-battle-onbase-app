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

      // Fallback: If no casts pass moderation, use all casts (moderation might be too strict)
      const castsToJudge = appropriateCasts.length > 0 ? appropriateCasts : casts;
      
      if (castsToJudge.length === 0) {
        throw new Error('No casts found for judging');
      }
      
      console.log(`📊 Judging ${castsToJudge.length} casts (${appropriateCasts.length} passed moderation, ${casts.length - appropriateCasts.length} used as fallback)`);

      // Apply winner selection method
      let winner;
      let judgmentDetails;

      switch (winnerMethod) {
        case 'random':
          winner = this.selectRandomWinner(castsToJudge);
          judgmentDetails = await this.generateRandomJudgment(battleData, castsToJudge, winner);
          break;
        
        case 'votes':
          winner = this.selectVoteWinner(castsToJudge);
          judgmentDetails = await this.generateVoteJudgment(battleData, castsToJudge, winner);
          break;
        
        case 'quality':
          winner = await this.selectQualityWinner(battleData, castsToJudge, moderationResults);
          judgmentDetails = await this.generateQualityJudgment(battleData, castsToJudge, winner);
          break;
        
        case 'hybrid':
        default:
          winner = await this.selectOptimizedHybridWinner(battleData, castsToJudge);
          judgmentDetails = await this.generateOptimizedHybridJudgment(battleData, castsToJudge, winner);
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

  // Optimized Hybrid Winner Selection (Non-LLM scoring + Group-based top-3)
  async selectOptimizedHybridWinner(battleData, casts) {
    this.logActivity('Starting optimized hybrid winner selection', {
      battleId: battleData.id,
      castCount: casts.length
    });

    try {
      // Step 1: Calculate non-LLM scores for all casts
      const castsWithScores = casts.map(cast => ({
        ...cast,
        qualityScore: this.calculateQualityScore(cast.content),
        relevanceScore: this.calculateRelevanceScore(cast.content, battleData),
        engagementScore: this.calculateEngagementScore(cast.content),
        totalScore: 0 // Will be calculated below
      }));

      // Step 2: Calculate weighted total scores
      castsWithScores.forEach(cast => {
        cast.totalScore = (
          cast.qualityScore * 0.4 +
          cast.relevanceScore * 0.3 +
          cast.engagementScore * 0.2 +
          this.calculateOriginalityScore(cast.content, casts) * 0.1
        );
      });

      // Step 3: Group casts by side
      const supportCasts = castsWithScores.filter(cast => cast.side === 'SUPPORT');
      const opposeCasts = castsWithScores.filter(cast => cast.side === 'OPPOSE');

      // Handle edge case: Only 1 cast total - that user is always the winner
      if (casts.length === 1) {
        const winner = castsWithScores[0];
        this.logActivity('Edge case: Only 1 cast submitted - automatic winner', {
          winnerId: winner.id,
          winnerSide: winner.side,
          winnerScore: winner.totalScore.toFixed(2)
        });
        
        return {
          winner: {
            id: winner.id,
            castId: winner.id,
            userId: winner.userId,
            content: winner.content,
            side: winner.side,
            score: winner.totalScore
          },
          winnerMethod: 'hybrid',
          reasoning: 'Only 1 cast submitted - automatic winner',
          statistics: {
            totalCasts: 1,
            supportCasts: supportCasts.length,
            opposeCasts: opposeCasts.length,
            winningSide: winner.side
          }
        };
      }

      // Handle edge cases: one side has no casts
      if (supportCasts.length === 0 && opposeCasts.length > 0) {
        this.logActivity('Edge case: Only OPPOSE casts found, selecting winner from OPPOSE');
        const top3 = opposeCasts
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 3);
        const randomIndex = Math.floor(Math.random() * top3.length);
        const winner = top3[randomIndex];
        
        return {
          winner: {
            id: winner.id,
            castId: winner.id,
            userId: winner.userId,
            content: winner.content,
            side: winner.side,
            score: winner.totalScore
          },
          winnerMethod: 'hybrid',
          reasoning: 'Only OPPOSE casts submitted',
          statistics: {
            totalCasts: casts.length,
            supportCasts: 0,
            opposeCasts: opposeCasts.length,
            winningSide: 'OPPOSE'
          }
        };
      }
      
      if (opposeCasts.length === 0 && supportCasts.length > 0) {
        this.logActivity('Edge case: Only SUPPORT casts found, selecting winner from SUPPORT');
        const top3 = supportCasts
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 3);
        const randomIndex = Math.floor(Math.random() * top3.length);
        const winner = top3[randomIndex];
        
        return {
          winner: {
            id: winner.id,
            castId: winner.id,
            userId: winner.userId,
            content: winner.content,
            side: winner.side,
            score: winner.totalScore
          },
          winnerMethod: 'hybrid',
          reasoning: 'Only SUPPORT casts submitted',
          statistics: {
            totalCasts: casts.length,
            supportCasts: supportCasts.length,
            opposeCasts: 0,
            winningSide: 'SUPPORT'
          }
        };
      }

      // Step 4: Determine winning group
      const supportScore = this.calculateGroupScore(supportCasts);
      const opposeScore = this.calculateGroupScore(opposeCasts);
      
      let winningGroup, winningSide;
      
      if (supportScore > opposeScore) {
        winningGroup = supportCasts;
        winningSide = 'SUPPORT';
      } else if (opposeScore > supportScore) {
        winningGroup = opposeCasts;
        winningSide = 'OPPOSE';
      } else {
        // Equal participants on both sides - use quality-based tie-breaking
        this.logActivity('Equal participants on both sides - using quality-based tie-breaking', {
          supportCount: supportCasts.length,
          opposeCount: opposeCasts.length,
          supportScore: supportScore.toFixed(2),
          opposeScore: opposeScore.toFixed(2)
        });
        
        // Tie-breaking: Use total quality score across all casts
        const supportTotalQuality = supportCasts.reduce((sum, cast) => sum + cast.qualityScore, 0);
        const opposeTotalQuality = opposeCasts.reduce((sum, cast) => sum + cast.qualityScore, 0);
        
        if (supportTotalQuality > opposeTotalQuality) {
          winningGroup = supportCasts;
          winningSide = 'SUPPORT';
          this.logActivity('Tie-breaker: SUPPORT wins on quality', {
            supportTotalQuality: supportTotalQuality.toFixed(2),
            opposeTotalQuality: opposeTotalQuality.toFixed(2)
          });
        } else if (opposeTotalQuality > supportTotalQuality) {
          winningGroup = opposeCasts;
          winningSide = 'OPPOSE';
          this.logActivity('Tie-breaker: OPPOSE wins on quality', {
            supportTotalQuality: supportTotalQuality.toFixed(2),
            opposeTotalQuality: opposeTotalQuality.toFixed(2)
          });
        } else {
          // Final tie-breaker: Random selection between sides
          const randomSide = Math.random() < 0.5 ? 'SUPPORT' : 'OPPOSE';
          winningGroup = randomSide === 'SUPPORT' ? supportCasts : opposeCasts;
          winningSide = randomSide;
          
          this.logActivity('Tie-breaker: Random selection used (equal quality)', {
            supportScore: supportScore.toFixed(2),
            opposeScore: opposeScore.toFixed(2),
            supportTotalQuality: supportTotalQuality.toFixed(2),
            opposeTotalQuality: opposeTotalQuality.toFixed(2),
            selectedSide: winningSide
          });
        }
      }

      // Step 5: Select top 3 from winning group
      const top3 = winningGroup
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 3);

      // Step 6: Randomly select winner from top 3
      const randomIndex = Math.floor(Math.random() * top3.length);
      const winner = top3[randomIndex];

      this.logActivity('Successfully selected optimized hybrid winner', {
        winningSide,
        top3Count: top3.length,
        winnerId: winner.id,
        winnerScore: winner.totalScore.toFixed(2)
      });

      return {
        ...winner,
        selectionMethod: 'optimized-hybrid',
        selectionReason: `Selected from top 3 of ${winningSide} group (${top3.length} candidates)`,
        groupAnalysis: {
          winningSide,
          supportScore: supportScore.toFixed(2),
          opposeScore: opposeScore.toFixed(2),
          top3Candidates: top3.map(c => ({
            id: c.id,
            score: c.totalScore.toFixed(2),
            content: c.content.substring(0, 50) + '...'
          }))
        }
      };

    } catch (error) {
      this.logActivity('Error in optimized hybrid winner selection', { error: error.message });
      // Fallback to random selection
      return this.selectRandomWinner(casts);
    }
  }

  // Non-LLM Quality Score Calculation
  calculateQualityScore(content) {
    let score = 5; // Base score

    // Length factor (optimal range: 50-120 characters)
    const length = content.length;
    if (length >= 50 && length <= 120) {
      score += 2;
    } else if (length >= 30 && length <= 140) {
      score += 1;
    }

    // Readability factors
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = content.split(/\s+/).length / sentences.length;
    
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 15) {
      score += 1;
    }

    // Evidence indicators
    const evidenceWords = ['because', 'since', 'due to', 'evidence', 'data', 'study', 'research', 'proves', 'shows'];
    const hasEvidence = evidenceWords.some(word => content.toLowerCase().includes(word));
    if (hasEvidence) score += 1;

    // Argument structure
    const argumentWords = ['however', 'although', 'despite', 'furthermore', 'moreover', 'therefore', 'thus'];
    const hasStructure = argumentWords.some(word => content.toLowerCase().includes(word));
    if (hasStructure) score += 1;

    return Math.min(Math.max(score, 1), 10);
  }

  // Non-LLM Relevance Score Calculation
  calculateRelevanceScore(content, battleData) {
    let score = 5; // Base score

    // Extract keywords from battle topic and description
    const topicKeywords = this.extractKeywords(battleData.title + ' ' + battleData.description);
    const contentKeywords = this.extractKeywords(content);

    // Calculate keyword overlap
    const overlap = topicKeywords.filter(keyword => 
      contentKeywords.some(contentKeyword => 
        contentKeyword.includes(keyword) || keyword.includes(contentKeyword)
      )
    ).length;

    const overlapRatio = overlap / Math.max(topicKeywords.length, 1);
    
    if (overlapRatio >= 0.3) {
      score += 3;
    } else if (overlapRatio >= 0.1) {
      score += 2;
    } else if (overlapRatio >= 0.05) {
      score += 1;
    }

    // Check for off-topic indicators
    const offTopicWords = ['unrelated', 'random', 'whatever', 'idk', 'lol', 'haha'];
    const hasOffTopic = offTopicWords.some(word => content.toLowerCase().includes(word));
    if (hasOffTopic) score -= 2;

    return Math.min(Math.max(score, 1), 10);
  }

  // Non-LLM Engagement Score Calculation
  calculateEngagementScore(content) {
    let score = 5; // Base score

    // Question marks (encourage discussion)
    const questionCount = (content.match(/\?/g) || []).length;
    score += Math.min(questionCount, 2);

    // Exclamation points (show passion)
    const exclamationCount = (content.match(/!/g) || []).length;
    score += Math.min(exclamationCount, 1);

    // Numbers and statistics (add credibility)
    const numberCount = (content.match(/\d+/g) || []).length;
    if (numberCount > 0) score += 1;

    // Controversial indicators
    const controversialWords = ['wrong', 'right', 'should', 'must', 'never', 'always', 'best', 'worst'];
    const hasControversial = controversialWords.some(word => content.toLowerCase().includes(word));
    if (hasControversial) score += 1;

    // Call to action
    const actionWords = ['think', 'consider', 'imagine', 'suppose', 'believe'];
    const hasAction = actionWords.some(word => content.toLowerCase().includes(word));
    if (hasAction) score += 1;

    return Math.min(Math.max(score, 1), 10);
  }

  // Non-LLM Originality Score Calculation
  calculateOriginalityScore(content, allCasts) {
    let score = 5; // Base score

    // Check for uniqueness against other casts
    const contentWords = this.extractKeywords(content);
    let similarityCount = 0;

    allCasts.forEach(otherCast => {
      if (otherCast.id !== content.id) {
        const otherWords = this.extractKeywords(otherCast.content);
        const commonWords = contentWords.filter(word => 
          otherWords.some(otherWord => 
            word.includes(otherWord) || otherWord.includes(word)
          )
        );
        similarityCount += commonWords.length;
      }
    });

    const avgSimilarity = similarityCount / Math.max(allCasts.length - 1, 1);
    
    if (avgSimilarity < 2) {
      score += 3; // Very original
    } else if (avgSimilarity < 4) {
      score += 2; // Moderately original
    } else if (avgSimilarity < 6) {
      score += 1; // Somewhat original
    }

    return Math.min(Math.max(score, 1), 10);
  }

  // Calculate group score (average of all casts in group)
  calculateGroupScore(groupCasts) {
    if (groupCasts.length === 0) return 0;
    
    const totalScore = groupCasts.reduce((sum, cast) => sum + cast.totalScore, 0);
    return totalScore / groupCasts.length;
  }

  // Extract keywords from text
  extractKeywords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }

  // Check if word is a stop word
  isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'she', 'use', 'man', 'oil', 'sit', 'set', 'run', 'eat', 'say', 'let', 'put', 'end', 'why', 'try', 'ask', 'men', 'few', 'any', 'own', 'same', 'tell', 'move', 'turn', 'come', 'made', 'live', 'here', 'give', 'name', 'very', 'just', 'form', 'much', 'great', 'think', 'help', 'low', 'line', 'before', 'move', 'right', 'boy', 'old', 'too', 'does', 'tell', 'sentence', 'three', 'want', 'air', 'well', 'also', 'play', 'small', 'end', 'put', 'home', 'read', 'hand', 'port', 'large', 'spell', 'add', 'even', 'land', 'here', 'must', 'big', 'high', 'such', 'follow', 'act', 'why', 'ask', 'men', 'change', 'went', 'light', 'kind', 'off', 'need', 'house', 'picture', 'try', 'us', 'again', 'animal', 'point', 'mother', 'world', 'near', 'build', 'self', 'earth', 'father', 'head', 'stand', 'own', 'page', 'should', 'country', 'found', 'answer', 'school', 'grow', 'study', 'still', 'learn', 'plant', 'cover', 'food', 'sun', 'four', 'between', 'state', 'keep', 'eye', 'never', 'last', 'let', 'thought', 'city', 'tree', 'cross', 'farm', 'hard', 'start', 'might', 'story', 'saw', 'far', 'sea', 'draw', 'left', 'late', 'run', 'dont', 'while', 'press', 'close', 'night', 'real', 'life', 'few', 'north', 'open', 'seem', 'together', 'next', 'white', 'children', 'begin', 'got', 'walk', 'example', 'ease', 'paper', 'group', 'always', 'music', 'those', 'both', 'mark', 'often', 'letter', 'until', 'mile', 'river', 'car', 'feet', 'care', 'second', 'book', 'carry', 'took', 'science', 'eat', 'room', 'friend', 'began', 'idea', 'fish', 'mountain', 'stop', 'once', 'base', 'hear', 'horse', 'cut', 'sure', 'watch', 'color', 'face', 'wood', 'main', 'enough', 'plain', 'girl', 'usual', 'young', 'ready', 'above', 'ever', 'red', 'list', 'though', 'feel', 'talk', 'bird', 'soon', 'body', 'dog', 'family', 'direct', 'pose', 'leave', 'song', 'measure', 'door', 'product', 'black', 'short', 'numeral', 'class', 'wind', 'question', 'happen', 'complete', 'ship', 'area', 'half', 'rock', 'order', 'fire', 'south', 'problem', 'piece', 'told', 'knew', 'pass', 'since', 'top', 'whole', 'king', 'space', 'heard', 'best', 'hour', 'better', 'during', 'hundred', 'five', 'remember', 'step', 'early', 'hold', 'west', 'ground', 'interest', 'reach', 'fast', 'verb', 'sing', 'listen', 'six', 'table', 'travel', 'less', 'morning', 'ten', 'simple', 'several', 'vowel', 'toward', 'war', 'lay', 'against', 'pattern', 'slow', 'center', 'love', 'person', 'money', 'serve', 'appear', 'road', 'map', 'rain', 'rule', 'govern', 'pull', 'cold', 'notice', 'voice', 'unit', 'power', 'town', 'fine', 'certain', 'fly', 'fall', 'lead', 'cry', 'dark', 'machine', 'note', 'wait', 'plan', 'figure', 'star', 'box', 'noun', 'field', 'rest', 'correct', 'able', 'pound', 'done', 'beauty', 'drive', 'stood', 'contain', 'front', 'teach', 'week', 'final', 'gave', 'green', 'oh', 'quick', 'develop', 'ocean', 'warm', 'free', 'minute', 'strong', 'special', 'mind', 'behind', 'clear', 'tail', 'produce', 'fact', 'street', 'inch', 'multiply', 'nothing', 'course', 'stay', 'wheel', 'full', 'force', 'blue', 'object', 'decide', 'surface', 'deep', 'moon', 'island', 'foot', 'system', 'busy', 'test', 'record', 'boat', 'common', 'gold', 'possible', 'plane', 'stead', 'dry', 'wonder', 'laugh', 'thousand', 'ago', 'ran', 'check', 'game', 'shape', 'equate', 'miss', 'brought', 'heat', 'snow', 'tire', 'bring', 'yes', 'distant', 'fill', 'east', 'paint', 'language', 'among'];
    return stopWords.includes(word);
  }

  // Generate Optimized Hybrid Judgment
  async generateOptimizedHybridJudgment(battleData, casts, winner) {
    this.logActivity('Generating optimized hybrid judgment', {
      winnerId: winner.id,
      winningSide: winner.groupAnalysis.winningSide
    });

    try {
      // Single LLM call for insights generation
      const insights = await this.generateInsightsFromTop3(winner.groupAnalysis.top3Candidates, battleData);
      
      const judgment = {
        method: 'optimized-hybrid',
        summary: `The ${winner.groupAnalysis.winningSide} side won with an average score of ${winner.groupAnalysis.winningSide === 'SUPPORT' ? winner.groupAnalysis.supportScore : winner.groupAnalysis.opposeScore}. Winner selected from top 3 candidates using optimized scoring.`,
        fairness: 'Selection based on objective scoring criteria and group performance',
        transparency: 'Non-LLM scoring with transparent criteria, random selection from top performers',
        insights: insights,
        groupAnalysis: winner.groupAnalysis,
        scoringMethod: 'Non-LLM quality, relevance, engagement, and originality scoring',
        selectionMethod: 'Random selection from top 3 of winning group'
      };

      this.logActivity('Successfully generated optimized hybrid judgment', {
        insightsGenerated: !!insights,
        groupAnalysis: winner.groupAnalysis.winningSide
      });

      return judgment;

    } catch (error) {
      this.logActivity('Error generating optimized hybrid judgment', { error: error.message });
      
      // Fallback judgment
      return {
        method: 'optimized-hybrid',
        summary: `Winner selected using optimized hybrid approach from ${winner.groupAnalysis.winningSide} group.`,
        fairness: 'Selection based on objective scoring criteria',
        transparency: 'Non-LLM scoring with transparent criteria',
        insights: null,
        groupAnalysis: winner.groupAnalysis,
        scoringMethod: 'Non-LLM quality, relevance, engagement, and originality scoring',
        selectionMethod: 'Random selection from top 3 of winning group'
      };
    }
  }

  // Generate insights from top 3 candidates (Single LLM call)
  async generateInsightsFromTop3(top3Candidates, battleData) {
    this.logActivity('Generating insights from top 3 candidates');

    try {
      const prompt = `Analyze the top 3 debate contributions and generate insights about the winning arguments.

BATTLE TOPIC: "${battleData.title}"
BATTLE DESCRIPTION: "${battleData.description}"

TOP 3 CONTRIBUTIONS:
${top3Candidates.map((candidate, index) => `
${index + 1}. Score: ${candidate.score}/10
   Content: "${candidate.content}"
`).join('\n')}

TASK: Generate insights about:
1. What made these arguments successful?
2. Common themes or patterns?
3. Key insights about the debate topic?
4. What can we learn from the winning side?

Provide a concise but insightful analysis (max 200 words).`;

      const result = await this.generateTextContent(prompt, 0.6);

      if (!result.success || !result.data) {
        throw new Error('Failed to generate insights');
      }

      this.logActivity('Successfully generated insights from top 3', {
        insightsLength: result.data.length
      });

      return result.data;

    } catch (error) {
      this.logActivity('Error generating insights from top 3', { error: error.message });
      return null;
    }
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
