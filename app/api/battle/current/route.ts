import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management (Edge Runtime has limitations with global state)
export const runtime = 'nodejs';

/**
 * GET /api/battle/current
 * Get the current active battle
 */
export async function GET(_request: NextRequest) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
    const currentBattle = await battleManager.getCurrentBattleSafe();
    
    if (currentBattle) {
      console.log('✅ Retrieved battle from database:', currentBattle.id);
      return NextResponse.json({
        success: true,
        battle: currentBattle
      });
    }
    
    console.log('ℹ️ No active battle found in database');
    return NextResponse.json({
      success: false,
      error: 'No active battle available'
    }, { status: 404 });

  } catch (error) {
    console.error('❌ Error fetching current battle:', error);
    
    // Handle database quota issues gracefully
    if (error.message && error.message.includes('quota')) {
      console.log('⚠️ Database quota exceeded, returning fallback response');
      return NextResponse.json({
        success: false,
        error: 'Service temporarily unavailable due to high demand. Please try again later.',
        fallback: true
      }, { status: 503 }); // Service Unavailable
    }
    
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
  let userAddress: string | undefined;
  
  try {
    const body = await request.json();
    userAddress = body.userAddress;

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'User address is required'
      }, { status: 400 });
    }

    const battleManager = await BattleManagerDB.getInstance();
    
    // Check if there's an active battle before allowing join
    const currentBattle = await battleManager.getCurrentBattleSafe();
    if (!currentBattle) {
      return NextResponse.json({
        success: false,
        error: 'No active battle available to join'
      }, { status: 400 });
    }
    
    await battleManager.joinBattle(userAddress);

    // Get user's updated points
    const db = await import('@/lib/services/database').then(m => m.default);
    const userPoints = await db.getUserPoints(userAddress);

    // Log user joining battle
    console.log(`🎯 User ${userAddress} joined battle and now has ${userPoints} points`);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined battle',
      points: userPoints
    });

  } catch (error) {
    console.error('Error joining battle:', error);
    
    // Handle "already joined" case gracefully
    if (error.message && error.message.includes('already joined')) {
      console.log(`⚠️ User ${userAddress || 'unknown'} attempted to join battle but already joined`);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }
    
    console.log(`❌ User ${userAddress || 'unknown'} failed to join battle: ${error.message || 'Unknown error'}`);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to join battle'
    }, { status: 500 });
  }
}
