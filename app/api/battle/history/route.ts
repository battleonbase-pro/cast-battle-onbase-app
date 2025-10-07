import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

/**
 * GET /api/battle/history
 * Get battle history with winners
 */
export async function GET(_request: NextRequest) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
    const battleHistory = await battleManager.getBattleHistory();

    // Format battle history for frontend
    const formattedHistory = battleHistory.map(historyEntry => ({
      id: historyEntry.battle.id,
      title: historyEntry.battle.title,
      description: historyEntry.battle.description,
      category: historyEntry.battle.category,
      source: historyEntry.battle.source,
      status: historyEntry.battle.status,
      startTime: historyEntry.battle.startTime,
      endTime: historyEntry.battle.endTime,
      participants: historyEntry.totalParticipants,
      casts: historyEntry.totalCasts,
      winnerAddress: historyEntry.winnerAddress,
      winner: historyEntry.battle.winners.length > 0 ? {
        address: historyEntry.battle.winners[0].user.address,
        username: historyEntry.battle.winners[0].user.username,
        position: historyEntry.battle.winners[0].position,
        prize: historyEntry.battle.winners[0].prize,
        pointsAwarded: 100 // Winner gets 100 points
      } : null,
      winners: historyEntry.battle.winners.map(winner => ({
        address: winner.user.address,
        username: winner.user.username,
        position: winner.position,
        prize: winner.prize,
        pointsAwarded: winner.position === 1 ? 100 : winner.position === 2 ? 50 : 25 // Different points for different positions
      })),
      completedAt: historyEntry.completedAt,
      createdAt: historyEntry.battle.createdAt
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
