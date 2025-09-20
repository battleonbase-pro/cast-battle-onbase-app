import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

/**
 * GET /api/battle/current
 * Get the current active battle
 */
export async function GET(request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    const currentBattle = await battleManager.getCurrentBattle();

    if (!currentBattle) {
      return NextResponse.json({
        success: false,
        error: 'No active battle available'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      battle: currentBattle
    });

  } catch (error) {
    console.error('Error fetching current battle:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch current battle'
    }, { status: 500 });
  }
}

/**
 * POST /api/battle/current
 * Join the current active battle
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'User address is required'
      }, { status: 400 });
    }

    const battleManager = BattleManagerDB.getInstance();
    await battleManager.joinBattle(userAddress);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined battle'
    });

  } catch (error) {
    console.error('Error joining battle:', error);
    
    // Handle "already joined" case gracefully
    if (error.message && error.message.includes('already joined')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to join battle'
    }, { status: 500 });
  }
}
