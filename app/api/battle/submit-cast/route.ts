import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
    
    // Get current battle to fetch its casts
    const currentBattle = await battleManager.getCurrentBattleSafe();
    if (!currentBattle) {
      return NextResponse.json({
        success: false,
        error: 'No active battle available'
      }, { status: 404 });
    }

    // Get casts for the current battle
    const db = await import('@/lib/services/database').then(m => m.default);
    const casts = await db.getCastsForBattle(currentBattle.id);

    // Transform casts to match frontend interface
    const transformedCasts = (casts || []).map((cast: any) => ({
      id: cast.id,
      content: cast.content,
      side: cast.side,
      userAddress: cast.user?.address || '', // Extract address from user object
      createdAt: cast.createdAt,
      user: cast.user // Keep user object for additional data if needed
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

export async function POST(request: NextRequest) {
  let userAddress: string | undefined;
  
  try {
    const body = await request.json();
    const { userAddress: address, content, side } = body;
    userAddress = address;
    
    if (!userAddress || !content || !side) {
      console.log(`❌ Invalid cast submission attempt - missing fields: userAddress=${!!userAddress}, content=${!!content}, side=${!!side}`);
      return NextResponse.json({ 
        error: 'Missing required fields: userAddress, content, side' 
      }, { status: 400 });
    }
    
    if (!['SUPPORT', 'OPPOSE'].includes(side)) {
      console.log(`❌ User ${userAddress} submitted invalid side: ${side}`);
      return NextResponse.json({ 
        error: 'Side must be either SUPPORT or OPPOSE' 
      }, { status: 400 });
    }
    
    if (content.trim().length < 10) {
      console.log(`❌ User ${userAddress} submitted cast too short (${content.trim().length} chars): "${content.trim()}"`);
      return NextResponse.json({ 
        error: 'Cast content must be at least 10 characters long' 
      }, { status: 400 });
    }
    
    if (content.trim().length > 140) {
      console.log(`❌ User ${userAddress} submitted cast too long (${content.trim().length} chars): "${content.trim().substring(0, 50)}..."`);
      return NextResponse.json({ 
        error: 'Cast content must be 140 characters or less' 
      }, { status: 400 });
    }
    
    const battleManager = await BattleManagerDB.getInstance();
    
    // Check if user is a participant in the current battle
    const currentBattle = await battleManager.getCurrentBattleSafe();
    if (!currentBattle) {
      return NextResponse.json({ 
        error: 'No active battle available' 
      }, { status: 404 });
    }
    
    // Check if user has already joined the battle, if not, join them automatically
    const isParticipant = currentBattle.participants.some((p: { user: { address: string } }) => p.user.address === userAddress);
    if (!isParticipant) {
      console.log(`🔄 User ${userAddress} not yet joined battle, joining automatically...`);
      const joinSuccess = await battleManager.joinBattle(userAddress);
      if (!joinSuccess) {
        console.log(`❌ Failed to join user ${userAddress} to battle`);
        return NextResponse.json({ 
          error: 'Failed to join battle' 
        }, { status: 500 });
      }
      console.log(`✅ User ${userAddress} automatically joined battle`);
    }
    
    // Create the cast
    const cast = await battleManager.createCast(userAddress, content.trim(), side);
    
    // Award participation points (10 points for submitting a cast)
    const db = await import('@/lib/services/database').then(m => m.default);
    const userPoints = await db.awardParticipationPoints(userAddress, 10);
    
    // Log user submitting cast
    console.log(`📝 User ${userAddress} submitted cast (${side}) and earned 10 points! Total points: ${userPoints}`);
    
    // Broadcast cast submission event to SSE connections
    try {
      const { broadcastBattleEvent } = await import('@/lib/services/battle-broadcaster');
      
      // Get updated casts for sentiment calculation
      const updatedCasts = await db.getCastsForBattle(currentBattle.id);
      const support = updatedCasts.filter((c: any) => c.side === 'SUPPORT').length;
      const oppose = updatedCasts.filter((c: any) => c.side === 'OPPOSE').length;
      const total = support + oppose;
      
      if (total > 0) {
        const sentiment = {
          support,
          oppose,
          supportPercent: Math.round((support / total) * 100),
          opposePercent: Math.round((oppose / total) * 100)
        };
        
        // Broadcast sentiment update
        broadcastBattleEvent('SENTIMENT_UPDATE', { sentiment });
      }
      
      // Broadcast cast submission
      broadcastBattleEvent('CAST_SUBMITTED', {
        cast: {
          id: cast.id,
          content: cast.content,
          side: cast.side,
          userAddress: userAddress,
          createdAt: cast.createdAt
        }
      });
    } catch (broadcastError) {
      console.error('Failed to broadcast cast submission event:', broadcastError);
    }
    
    return NextResponse.json({ 
      success: true, 
      cast: {
        id: cast.id,
        content: cast.content,
        side: cast.side,
        createdAt: cast.createdAt
      },
      points: userPoints,
      pointsAwarded: 10
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error submitting cast:', error);
    console.log(`❌ User ${userAddress || 'unknown'} failed to submit cast: ${errorMessage}`);
    return NextResponse.json({ 
      error: 'Failed to submit cast' 
    }, { status: 500 });
  }
}
