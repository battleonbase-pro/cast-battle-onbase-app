import { NextRequest, NextResponse } from 'next/server';
import newsService from '@/lib/services/news-service';

export async function GET(request: NextRequest) {
  try {
    const topic = await newsService.getDailyBattleTopic();
    
    return NextResponse.json({
      success: true,
      topics: [topic]
    });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      topics: []
    }, { status: 500 });
  }
}