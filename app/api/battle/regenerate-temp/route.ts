import { NextResponse } from 'next/server';
import BattleManagerDB from '../../../../lib/services/battle-manager-db';
import NewsService from '../../../../lib/services/news-service';

export async function GET() {
  try {
    console.log('🔄 API: Regenerating battle (without image fields)...');
    const battleManager = BattleManagerDB.getInstance();
    
    // Clear news service cache to ensure fresh topic generation
    NewsService.clearCache();
    
    // Complete any active battle
    const currentBattle = await battleManager.getCurrentBattle();
    if (currentBattle) {
      console.log(`📊 Current active battle found: "${currentBattle.title}". Completing it.`);
      await battleManager.handleBattleCompletion(currentBattle.id);
    } else {
      console.log('📊 No active battle found to complete.');
    }
    
    // Create a new battle without image fields (temporary workaround)
    console.log('🎯 Creating a new battle (temporary workaround)...');
    
    // Get a fresh topic from the news service
    const topic = await NewsService.getDailyBattleTopic();
    console.log('📰 Generated topic:', topic.title);
    console.log('🖼️ Topic has imageUrl:', !!topic.imageUrl);
    
    // Create battle data without image fields for now
    const battleData = {
      title: topic.title,
      description: topic.description,
      category: topic.category,
      source: topic.source,
      sourceUrl: topic.articleUrl || topic.sourceUrl,
      // Temporarily exclude imageUrl and thumbnail until Prisma client is regenerated
      // imageUrl: topic.imageUrl,
      // thumbnail: topic.thumbnail,
      startTime: new Date(),
      endTime: new Date(Date.now() + (1 * 60 * 60 * 1000)), // 1 hour
      durationHours: 1,
      maxParticipants: 1000,
      debatePoints: topic.debatePoints,
      overallScore: topic.qualityAnalysis?.overallScore,
      balanceScore: topic.qualityAnalysis?.balanceScore,
      complexity: topic.complexity,
      controversyLevel: topic.controversyLevel,
    };
    
    // Create the battle using the database service directly
    const newBattle = await battleManager.db.createBattle(battleData);
    
    console.log(`✅ New battle created successfully: "${newBattle.title}"`);
    console.log('🖼️ Image data available but not stored due to Prisma client issue');
    
    return NextResponse.json({ 
      success: true, 
      battle: newBattle,
      message: 'Battle created successfully (image fields temporarily excluded)',
      imageData: {
        imageUrl: topic.imageUrl ? 'Available' : 'Not available',
        thumbnail: topic.thumbnail ? 'Available' : 'Not available'
      }
    });
    
  } catch (error) {
    console.error('❌ Error regenerating battle:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
