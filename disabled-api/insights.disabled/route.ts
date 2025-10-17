import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database';

const db = DatabaseService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const battleId = searchParams.get('battleId');

    if (!battleId) {
      return NextResponse.json(
        { success: false, error: 'Battle ID is required' },
        { status: 400 }
      );
    }

    // Get battle with insights
    const battle = await db.getBattleById(battleId);
    
    if (!battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      battle: {
        id: battle.id,
        title: battle.title,
        description: battle.description,
        category: battle.category,
        status: battle.status,
        insights: battle.insights,
        completedAt: battle.status === 'COMPLETED' ? battle.updatedAt : null,
      }
    });

  } catch (error) {
    console.error('Error fetching battle insights:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
