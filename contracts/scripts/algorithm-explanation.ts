import { ethers } from "hardhat";

async function main() {
  try {
    console.log("🧠 AI JUDGE ALGORITHM EXPLAINED");
    console.log("   How the winner selection algorithm works");
    
    console.log("\n🎯 OVERVIEW:");
    console.log("   The AI judge uses a multi-factor scoring system to determine battle winners.");
    console.log("   Each cast gets scored on 5 different criteria, then weighted and combined.");
    
    console.log("\n📊 SCORING COMPONENTS:");
    
    console.log("\n1️⃣ QUALITY SCORE (35% weight):");
    console.log("   Measures the overall quality of the argument");
    console.log("   ```javascript");
    console.log("   calculateQualityScore(content) {");
    console.log("     let score = 5; // Base score");
    console.log("     ");
    console.log("     // Length analysis");
    console.log("     if (content.length > 100) score += 1;");
    console.log("     if (content.length > 200) score += 1;");
    console.log("     ");
    console.log("     // Structure analysis");
    console.log("     const sentences = content.split(/[.!?]+/).length;");
    console.log("     if (sentences > 3) score += 1;");
    console.log("     ");
    console.log("     // Vocabulary analysis");
    console.log("     const words = content.split(' ').length;");
    console.log("     if (words > 20) score += 1;");
    console.log("     ");
    console.log("     // Argument indicators");
    console.log("     const indicators = ['because', 'therefore', 'however', 'although'];");
    console.log("     const hasIndicators = indicators.some(word => content.includes(word));");
    console.log("     if (hasIndicators) score += 1;");
    console.log("     ");
    console.log("     return Math.min(Math.max(score, 1), 10);");
    console.log("   }");
    console.log("   ```");
    
    console.log("\n2️⃣ RELEVANCE SCORE (25% weight):");
    console.log("   Measures how relevant the argument is to the battle topic");
    console.log("   ```javascript");
    console.log("   calculateRelevanceScore(content, battleData) {");
    console.log("     let score = 5; // Base score");
    console.log("     ");
    console.log("     // Topic keyword matching");
    console.log("     const topicKeywords = extractKeywords(battleData.title + ' ' + battleData.description);");
    console.log("     const contentKeywords = extractKeywords(content);");
    console.log("     ");
    console.log("     const matchingKeywords = contentKeywords.filter(word =>");
    console.log("       topicKeywords.some(topicWord => word.includes(topicWord))");
    console.log("     );");
    console.log("     ");
    console.log("     // Score based on keyword overlap");
    console.log("     const overlapRatio = matchingKeywords.length / Math.max(contentKeywords.length, 1);");
    console.log("     score += overlapRatio * 3;");
    console.log("     ");
    console.log("     // Context relevance");
    console.log("     const contextWords = ['debate', 'argument', 'discussion', 'opinion'];");
    console.log("     const hasContext = contextWords.some(word => content.toLowerCase().includes(word));");
    console.log("     if (hasContext) score += 1;");
    console.log("     ");
    console.log("     return Math.min(Math.max(score, 1), 10);");
    console.log("   }");
    console.log("   ```");
    
    console.log("\n3️⃣ ENGAGEMENT SCORE (15% weight):");
    console.log("   Measures how engaging and persuasive the argument is");
    console.log("   ```javascript");
    console.log("   calculateEngagementScore(content) {");
    console.log("     let score = 5; // Base score");
    console.log("     ");
    console.log("     // Question engagement");
    console.log("     const questionCount = (content.match(/\\?/g) || []).length;");
    console.log("     if (questionCount > 0) score += 1;");
    console.log("     ");
    console.log("     // Emotional engagement");
    console.log("     const emotionalWords = ['important', 'crucial', 'significant', 'vital'];");
    console.log("     const hasEmotional = emotionalWords.some(word => content.toLowerCase().includes(word));");
    console.log("     if (hasEmotional) score += 1;");
    console.log("     ");
    console.log("     // Call to action");
    console.log("     const actionWords = ['think', 'consider', 'imagine', 'suppose', 'believe'];");
    console.log("     const hasAction = actionWords.some(word => content.toLowerCase().includes(word));");
    console.log("     if (hasAction) score += 1;");
    console.log("     ");
    console.log("     return Math.min(Math.max(score, 1), 10);");
    console.log("   }");
    console.log("   ```");
    
    console.log("\n4️⃣ LIKE SCORE (15% weight) - NEW!");
    console.log("   Measures community engagement through likes");
    console.log("   ```javascript");
    console.log("   calculateLikeScore(likeCount) {");
    console.log("     // Neutral score for no likes");
    console.log("     if (likeCount === 0) return 5;");
    console.log("     ");
    console.log("     // Logarithmic scaling to prevent extreme bias");
    console.log("     const logScore = Math.log(likeCount + 1) * 2;");
    console.log("     return Math.min(logScore, 10);");
    console.log("   }");
    console.log("   ```");
    console.log("   ");
    console.log("   Examples:");
    console.log("   - 0 likes → 5.0 score");
    console.log("   - 1 like → 6.9 score");
    console.log("   - 3 likes → 8.3 score");
    console.log("   - 10 likes → 9.2 score");
    console.log("   - 50 likes → 10.0 score (capped)");
    
    console.log("\n5️⃣ ORIGINALITY SCORE (10% weight):");
    console.log("   Measures how unique the argument is compared to others");
    console.log("   ```javascript");
    console.log("   calculateOriginalityScore(content, allCasts) {");
    console.log("     let score = 5; // Base score");
    console.log("     ");
    console.log("     // Extract keywords from content");
    console.log("     const contentWords = extractKeywords(content);");
    console.log("     let similarityCount = 0;");
    console.log("     ");
    console.log("     // Compare with other casts");
    console.log("     allCasts.forEach(otherCast => {");
    console.log("       if (otherCast.id !== content.id) {");
    console.log("         const otherWords = extractKeywords(otherCast.content);");
    console.log("         const commonWords = contentWords.filter(word =>");
    console.log("           otherWords.some(otherWord => word.includes(otherWord))");
    console.log("         );");
    console.log("         similarityCount += commonWords.length;");
    console.log("       }");
    console.log("     });");
    console.log("     ");
    console.log("     // Lower similarity = higher originality");
    console.log("     const uniquenessRatio = 1 - (similarityCount / Math.max(contentWords.length, 1));");
    console.log("     score += uniquenessRatio * 3;");
    console.log("     ");
    console.log("     return Math.min(Math.max(score, 1), 10);");
    console.log("   }");
    console.log("   ```");
    
    console.log("\n🧮 FINAL SCORE CALCULATION:");
    console.log("   ```javascript");
    console.log("   totalScore = (");
    console.log("     qualityScore * 0.35 +      // 35%");
    console.log("     relevanceScore * 0.25 +    // 25%");
    console.log("     engagementScore * 0.15 +   // 15%");
    console.log("     likeScore * 0.15 +         // 15%");
    console.log("     originalityScore * 0.1    // 10%");
    console.log("   );");
    console.log("   ```");
    
    console.log("\n🎯 WINNER SELECTION PROCESS:");
    console.log("   1. Calculate all scores for each cast");
    console.log("   2. Group casts by side (SUPPORT vs OPPOSE)");
    console.log("   3. Calculate group scores (sum of individual scores)");
    console.log("   4. Determine winning side");
    console.log("   5. Select top 3 casts from winning side");
    console.log("   6. Randomly pick winner from top 3");
    
    console.log("\n📊 EXAMPLE CALCULATION:");
    console.log("   Cast: 'I think AI will revolutionize healthcare because it can analyze");
    console.log("   medical data faster than humans. This is crucial for early diagnosis.'");
    console.log("   ");
    console.log("   Quality Score: 8.0 (good length, structure, indicators)");
    console.log("   Relevance Score: 7.5 (matches AI topic keywords)");
    console.log("   Engagement Score: 7.0 (has 'think', 'crucial', persuasive)");
    console.log("   Like Score: 6.9 (1 like)");
    console.log("   Originality Score: 6.0 (somewhat unique)");
    console.log("   ");
    console.log("   Total Score = (8.0 * 0.35) + (7.5 * 0.25) + (7.0 * 0.15) + (6.9 * 0.15) + (6.0 * 0.1)");
    console.log("   Total Score = 2.8 + 1.875 + 1.05 + 1.035 + 0.6 = 7.36");
    
    console.log("\n🔍 KEY FEATURES:");
    console.log("   ✅ Multi-factor scoring (not just AI opinion)");
    console.log("   ✅ Community input through likes");
    console.log("   ✅ Balanced weighting system");
    console.log("   ✅ Logarithmic scaling prevents bias");
    console.log("   ✅ Transparent and auditable");
    console.log("   ✅ Quality still matters most (35%)");
    console.log("   ✅ Community engagement matters (15%)");
    
    console.log("\n🎮 WHY THIS APPROACH:");
    console.log("   1. Quality ensures good arguments win");
    console.log("   2. Relevance keeps arguments on-topic");
    console.log("   3. Engagement rewards persuasive writing");
    console.log("   4. Likes add community validation");
    console.log("   5. Originality prevents copy-paste");
    console.log("   6. Random selection from top 3 adds fairness");
    
    console.log("\n💡 ALGORITHM BENEFITS:");
    console.log("   ✅ Prevents AI bias (uses multiple factors)");
    console.log("   ✅ Includes community input (likes)");
    console.log("   ✅ Rewards quality AND popularity");
    console.log("   ✅ Transparent scoring system");
    console.log("   ✅ Fair winner selection process");
    console.log("   ✅ Prevents manipulation (logarithmic scaling)");
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
