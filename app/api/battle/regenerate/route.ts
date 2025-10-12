import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BattleStatus } from '@prisma/client';
import NewsService from '@/lib/services/news-service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Regenerating debate with real news data...');
    
    // Get current active battle
    const currentBattle = await prisma.battle.findFirst({
      where: {
        status: BattleStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (currentBattle) {
      console.log(`📊 Current battle: "${currentBattle.title}"`);
      
      // Complete the current battle
      await prisma.battle.update({
        where: { id: currentBattle.id },
        data: { 
          status: BattleStatus.COMPLETED
        }
      });
      console.log('✅ Current battle completed');
    }

    // Generate new battle topic with real news data
    console.log('🎯 Generating new battle topic with real news data...');
    const topic = await NewsService.getDailyBattleTopic();
    
    console.log(`📰 New topic: "${topic.title}"`);
    console.log(`🖼️ ImageUrl: ${topic.imageUrl ? '✅ Yes' : '❌ No'}`);
    if (topic.imageUrl) {
      console.log(`   URL: ${topic.imageUrl.substring(0, 80)}...`);
    }
    console.log(`🖼️ Thumbnail: ${topic.thumbnail ? '✅ Yes' : '❌ No'}`);
    if (topic.thumbnail) {
      console.log(`   URL: ${topic.thumbnail.substring(0, 80)}...`);
    }

    // Create new battle with real data
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (1 * 60 * 60 * 1000)); // 1 hour

    const newBattle = await prisma.battle.create({
      data: {
        title: topic.title,
        description: topic.description,
        category: topic.category,
        source: topic.source,
        sourceUrl: topic.sourceUrl,
        imageUrl: topic.imageUrl,
        thumbnail: topic.thumbnail,
        startTime: startTime,
        endTime: endTime,
        durationHours: 1,
        maxParticipants: 1000,
        debatePoints: topic.debatePoints,
        overallScore: topic.overallScore,
        balanceScore: topic.balanceScore,
        complexity: topic.complexity,
        controversyLevel: topic.controversyLevel,
        status: BattleStatus.ACTIVE,
      },
    });

    console.log('✅ New battle created successfully!');
    console.log(`Battle ID: ${newBattle.id}`);
    console.log(`Battle Title: ${newBattle.title}`);
    console.log(`ImageUrl: ${newBattle.imageUrl ? '✅ Present' : '❌ Not Present'}`);
    console.log(`Thumbnail: ${newBattle.thumbnail ? '✅ Present' : '❌ Not Present'}`);

    return NextResponse.json({
      success: true,
      battle: {
        id: newBattle.id,
        title: newBattle.title,
        imageUrl: newBattle.imageUrl,
        thumbnail: newBattle.thumbnail,
        category: newBattle.category,
        source: newBattle.source
      }
    });

  } catch (error) {
    console.error('❌ Failed to create new battle:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
