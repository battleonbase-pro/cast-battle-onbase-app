import { NextRequest, NextResponse } from 'next/server';
import databaseService from '@/lib/services/database';

/**
 * GET /api/battle/results?battleId=xxx
 * Get detailed battle results including winner points
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const battleId = searchParams.get('battleId');

    if (!battleId) {
      return NextResponse.json({
        success: false,
        error: 'Battle ID is required'
      }, { status: 400 });
    }

    // Get battle details
    const battle = await databaseService.getBattleById(battleId);
    if (!battle) {
      return NextResponse.json({
        success: false,
        error: 'Battle not found'
      }, { status: 404 });
    }

    // Get battle history for additional info
    const battleHistory = await databaseService.prisma.battleHistory.findUnique({
      where: { battleId },
      include: {
        battle: {
          include: {
            winners: {
              include: {
                user: true
              }
            },
            participants: {
              include: {
                user: true
              }
            },
            casts: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!battleHistory) {
      return NextResponse.json({
        success: false,
        error: 'Battle history not found'
      }, { status: 404 });
    }

    // Format results
    const results = {
      battle: {
        id: battle.id,
        title: battle.title,
        description: battle.description,
        category: battle.category,
        source: battle.source,
        status: battle.status,
        startTime: battle.startTime,
        endTime: battle.endTime,
        completedAt: battleHistory.completedAt
      },
      statistics: {
        totalParticipants: battleHistory.totalParticipants,
        totalCasts: battleHistory.totalCasts,
        supportCasts: battle.casts.filter(cast => cast.side === 'SUPPORT').length,
        opposeCasts: battle.casts.filter(cast => cast.side === 'OPPOSE').length
      },
      winner: battleHistory.winnerAddress ? {
        address: battleHistory.winnerAddress,
        pointsAwarded: 100, // Winner gets 100 points
        position: 1,
        prize: 'Winner of the battle'
      } : null,
      participants: battle.participants.map(p => ({
        address: p.user.address,
        pointsAwarded: 10, // All participants get 10 points
        castsSubmitted: battle.casts.filter(cast => cast.userId === p.userId).length
      }))
    };

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error fetching battle results:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch battle results'
    }, { status: 500 });
  }
}
