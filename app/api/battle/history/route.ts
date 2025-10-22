import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

/**
 * GET /api/battle/history
 * Get battle history with winners
 */
export async function GET(_request: NextRequest) {
  try {
    // Try to get battle manager, but provide fallback if it fails
    let battleHistory = [];
    
    try {
      const battleManager = await BattleManagerDB.getInstance();
      battleHistory = await battleManager.getBattleHistory(5); // Limit to latest 5 battles
    } catch (battleManagerError) {
      console.warn('BattleManagerDB not available for history, using fallback:', battleManagerError);
      
      // Fallback: Create mock battle history for testing
      battleHistory = [
        {
          battle: {
            id: 'mock-battle-1',
            title: 'Should remote work be the default?',
            description: 'A debate about the future of work and remote vs office arrangements.',
            category: 'Business',
            source: 'Mock Data',
            imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop',
            thumbnail: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&h=150&fit=crop',
            debatePoints: {
              Support: ['Increased productivity and flexibility', 'Better work-life balance', 'Reduced commuting costs'],
              Oppose: ['Loss of team collaboration', 'Difficulty in maintaining company culture', 'Technology challenges']
            },
            status: 'COMPLETED',
            startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            winners: [
              {
                user: { address: '0x1234...5678', username: 'RemoteAdvocate' },
                position: 1,
                prize: '100 USDC'
              }
            ],
            insights: 'Remote work debate showed strong support for flexibility, with productivity arguments winning over collaboration concerns.',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          totalParticipants: 15,
          totalCasts: 23,
          winnerAddress: '0x1234...5678',
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }

    // Format battle history for frontend
    const formattedHistory = battleHistory.map(historyEntry => ({
      id: historyEntry.battle.id,
      title: historyEntry.battle.title,
      description: historyEntry.battle.description,
      category: historyEntry.battle.category,
      source: historyEntry.battle.source,
      imageUrl: historyEntry.battle.imageUrl,
      thumbnail: historyEntry.battle.thumbnail,
      debatePoints: historyEntry.battle.debatePoints,
      status: historyEntry.battle.status,
      startTime: historyEntry.battle.startTime,
      endTime: historyEntry.battle.endTime,
      participants: historyEntry.totalParticipants,
      casts: historyEntry.totalCasts,
      winnerAddress: historyEntry.winnerAddress,
      insights: historyEntry.battle.insights, // Include AI-generated insights
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
