import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

/**
 * GET /api/battle/casts
 * Get casts for the current battle (optionally filtered by user address)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    const battleManager = await BattleManagerDB.getInstance();
    
    // Get current battle
    const currentBattle = await battleManager.getCurrentBattleSafe();
    if (!currentBattle) {
      return NextResponse.json({
        success: false,
        error: 'No active battle available'
      }, { status: 404 });
    }

    // Get casts for the current battle
    const db = await import('@/lib/services/database').then(m => m.default);
    const allCasts = await db.getCastsForBattle(currentBattle.id);

    // Filter by user address if provided
    let casts = allCasts;
    if (userAddress) {
      casts = allCasts.filter((cast: any) => 
        cast.user?.address?.toLowerCase() === userAddress.toLowerCase()
      );
    }

    // Transform casts to match frontend interface
    const transformedCasts = casts.map((cast: any) => ({
      id: cast.id,
      content: cast.content,
      side: cast.side,
      userAddress: cast.user?.address || '',
      createdAt: cast.createdAt,
      timestamp: cast.createdAt,
      likes: cast.likes || 0,
      isLiked: false
    }));

    return NextResponse.json({
      success: true,
      casts: transformedCasts
    });

  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch casts'
    }, { status: 500 });
  }
}

