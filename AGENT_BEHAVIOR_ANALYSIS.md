# Agent Behavior Analysis: Edge Cases & Tie Scenarios

## Overview
This document analyzes how the AI agents behave in different edge cases and tie scenarios, including single participants, equal participation on both sides, and one-sided battles.

## Scenario Analysis

### 1. Single Participant (1 Cast Total) ✅

**Behavior:**
- **Automatic Winner**: The single participant automatically wins
- **Points**: Receives 100 points
- **Insights**: Generated from the single cast
- **Method**: `single-participant`

**Code Logic:**
```typescript
if (casts.length === 1) {
  const winner = castsWithScores[0];
  return {
    winner: {
      id: winner.id,
      userId: winner.userId,
      content: winner.content,
      side: winner.side,
      score: winner.totalScore
    },
    winnerMethod: 'hybrid',
    reasoning: 'Only 1 cast submitted - automatic winner',
    groupAnalysis: {
      winningSide: winner.side,
      top3Candidates: [winner], // Single cast becomes "top 3"
      supportScore: winner.side === 'SUPPORT' ? winner.totalScore : 0,
      opposeScore: winner.side === 'OPPOSE' ? winner.totalScore : 0
    }
  };
}
```

### 2. Equal Number of Participants on Both Sides

**Scenario**: Same number of SUPPORT and OPPOSE casts (e.g., 2 SUPPORT, 2 OPPOSE)

**Main App Behavior (lib/agents/judge-agent.ts):**
1. **Step 1**: Calculate group scores for both sides
2. **Step 2**: If group scores are equal → **Quality-based tie-breaking**
3. **Step 3**: If quality scores are equal → **Random selection**

**Tie-Breaking Logic:**
```typescript
if (supportScore === opposeScore) {
  // Tie-breaking: Use total quality score across all casts
  const supportTotalQuality = supportCasts.reduce((sum, cast) => sum + cast.qualityScore, 0);
  const opposeTotalQuality = opposeCasts.reduce((sum, cast) => sum + cast.qualityScore, 0);
  
  if (supportTotalQuality > opposeTotalQuality) {
    winningSide = 'SUPPORT';
  } else if (opposeTotalQuality > supportTotalQuality) {
    winningSide = 'OPPOSE';
  } else {
    // Final tie-breaker: Random selection between sides
    const randomSide = Math.random() < 0.5 ? 'SUPPORT' : 'OPPOSE';
    winningSide = randomSide;
  }
}
```

**Worker Behavior (worker/lib/agents/judge-agent.ts):**
- **Simpler Logic**: Defaults to OPPOSE when scores are equal
- **No Tie-Breaking**: Uses simple `supportScore > opposeScore ? SUPPORT : OPPOSE`

### 3. One-Sided Battles

#### Only SUPPORT Casts (No OPPOSE)
**Behavior:**
- **Winner**: Selected from SUPPORT casts only
- **Method**: Random selection from top 3 SUPPORT casts
- **Reasoning**: "Only SUPPORT casts submitted"

#### Only OPPOSE Casts (No SUPPORT)
**Behavior:**
- **Winner**: Selected from OPPOSE casts only  
- **Method**: Random selection from top 3 OPPOSE casts
- **Reasoning**: "Only OPPOSE casts submitted"

**Code Logic:**
```typescript
if (supportCasts.length === 0 && opposeCasts.length > 0) {
  // Select winner from OPPOSE casts
  const top3 = opposeCasts.sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  const randomIndex = Math.floor(Math.random() * top3.length);
  const winner = top3[randomIndex];
  return { winner, reasoning: 'Only OPPOSE casts submitted' };
}

if (opposeCasts.length === 0 && supportCasts.length > 0) {
  // Select winner from SUPPORT casts
  const top3 = supportCasts.sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  const randomIndex = Math.floor(Math.random() * top3.length);
  const winner = top3[randomIndex];
  return { winner, reasoning: 'Only SUPPORT casts submitted' };
}
```

### 4. Equal Group Scores (Different Participant Counts)

**Scenario**: Different number of participants but same group score (e.g., 3 SUPPORT vs 1 OPPOSE, but scores are equal)

**Behavior:**
- **Main App**: Uses quality-based tie-breaking, then random if still tied
- **Worker**: Defaults to OPPOSE side

## Scoring System

### Group Score Calculation
```typescript
calculateGroupScore(casts) {
  if (casts.length === 0) return 0;
  
  const totalScore = casts.reduce((sum, cast) => sum + cast.totalScore, 0);
  return totalScore / casts.length; // Average score per cast
}
```

### Individual Cast Scoring
Each cast gets scored on:
- **Quality (40%)**: Argument strength, clarity, evidence
- **Relevance (30%)**: Topic alignment, staying on point  
- **Engagement (20%)**: Discussion potential, controversy level
- **Originality (10%)**: Unique insights, fresh perspective

## Winner Selection Process

### Multi-Participant Battles
1. **Calculate Scores**: Individual cast scores + group averages
2. **Determine Winning Side**: Based on group scores
3. **Select Top 3**: From winning side, sorted by total score
4. **Random Selection**: Winner chosen randomly from top 3
5. **Generate Insights**: From the top 3 candidates

### Single Participant Battles
1. **Automatic Winner**: Single cast wins automatically
2. **Generate Insights**: From the single cast
3. **Award Points**: 100 points to winner

## Key Differences: Main App vs Worker

| Scenario | Main App | Worker |
|----------|----------|---------|
| **Single Participant** | ✅ Automatic winner + insights | ✅ Automatic winner + insights |
| **Equal Participants** | ✅ Quality tie-breaking → Random | ❌ Defaults to OPPOSE |
| **One-Sided Battles** | ✅ Handles both sides | ✅ Handles both sides |
| **Equal Group Scores** | ✅ Multi-level tie-breaking | ❌ Simple default |

## Recommendations

### 1. Sync Worker Logic
The worker should implement the same tie-breaking logic as the main app for consistency.

### 2. Enhanced Tie-Breaking
Consider additional tie-breaking criteria:
- **Engagement Score**: Higher engagement wins
- **Relevance Score**: More relevant content wins
- **Cast Length**: Optimal length (50-120 chars) wins

### 3. Transparency
Add more detailed logging for tie-breaking decisions to improve transparency.

## Conclusion

The system handles most edge cases well, with the main app having more sophisticated tie-breaking logic than the worker. Single participants are handled perfectly, and one-sided battles work correctly. The main area for improvement is synchronizing the tie-breaking logic between the main app and worker.
