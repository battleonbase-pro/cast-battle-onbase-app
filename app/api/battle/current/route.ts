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
    // Try to get battle from database first
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
      
    } catch (battleManagerError) {
      console.warn('⚠️ Database unavailable, using fallback battle:', battleManagerError.message);
    }

    // Only use fallback when database is unavailable or no battle exists
    console.log('🔄 Using fallback battle data');
    const fallbackBattle = {
      id: 'fallback-battle-1',
      title: 'Should AI be regulated by governments?',
      description: 'A debate about the role of government in regulating artificial intelligence development and deployment.',
      category: 'Technology',
      source: 'Mock Data',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
      debatePoints: {
        Support: [
          'AI regulation ensures safety and prevents misuse',
          'Government oversight protects citizens from AI risks',
          'Regulation promotes responsible AI development'
        ],
        Oppose: [
          'Over-regulation stifles innovation and progress',
          'AI development should be market-driven, not government-controlled',
          'Regulation may lag behind rapidly evolving AI technology'
        ]
      },
      participants: [],
      casts: [],
      status: 'ACTIVE',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      winners: []
    };

    return NextResponse.json({
      success: true,
      battle: fallbackBattle
    });

  } catch (error) {
    console.error('❌ Error fetching current battle:', error);
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
