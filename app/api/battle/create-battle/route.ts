import { NextRequest, NextResponse } from 'next/server';
import battleService from '@/lib/services/battle-service';

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();
    
    if (!topic) {
      return NextResponse.json({
        success: false,
        error: 'Topic is required'
      }, { status: 400 });
    }

    const battle = battleService.createBattle(topic);
    
    return NextResponse.json({
      success: true,
      battle: {
        ...battle,
        battleId: battle.id
      }
    });
  } catch (error) {
    console.error('Error creating battle:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}