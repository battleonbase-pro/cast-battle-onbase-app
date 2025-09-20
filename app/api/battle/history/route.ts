import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

/**
 * GET /api/battle/history
 * Get battle history with winners
 */
export async function GET(request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    const battleHistory = await battleManager.getBattleHistory();

    // Format battle history for frontend
    const formattedHistory = battleHistory.map(battle => ({
      id: battle.id,
      topic: battle.topic,
      status: battle.status,
      startTime: battle.startTime,
      endTime: battle.endTime,
      participants: battle.participants.length,
      winners: battle.winners,
      createdAt: battle.createdAt
    }));

    return NextResponse.json({
      success: true,
      battles: formattedHistory,
      total: formattedHistory.length
    });

  } catch (error) {
    console.error('Error fetching battle history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch battle history'
    }, { status: 500 });
  }
}
