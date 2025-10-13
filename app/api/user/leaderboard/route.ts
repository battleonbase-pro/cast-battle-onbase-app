import { NextRequest, NextResponse } from 'next/server';
import databaseService from '@/lib/services/database';

/**
 * GET /api/user/leaderboard?limit=10
 * Get leaderboard with top users by points
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`[Leaderboard API] Fetching leaderboard with limit: ${limit}`);
    const leaderboard = await databaseService.getLeaderboard(limit);
    console.log(`[Leaderboard API] Found ${leaderboard.length} users in leaderboard`);

    return NextResponse.json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch leaderboard'
    }, { status: 500 });
  }
}

