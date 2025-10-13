import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

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
    
    // Check if user has already joined the battle
    const isParticipant = currentBattle.participants.some((p: { user: { address: string } }) => p.user.address === userAddress);
    if (!isParticipant) {
      console.log(`❌ User ${userAddress} attempted to submit cast without joining battle`);
      return NextResponse.json({ 
        error: 'You must join the battle before submitting arguments' 
      }, { status: 403 });
    }
    
    // Create the cast
    const cast = await battleManager.createCast(userAddress, content.trim(), side);
    
    // Award participation points (10 points for submitting a cast)
    const db = await import('@/lib/services/database').then(m => m.default);
    const userPoints = await db.awardParticipationPoints(userAddress, 10);
    
    // Log user submitting cast
    console.log(`📝 User ${userAddress} submitted cast (${side}) and earned 10 points! Total points: ${userPoints}`);
    
    // Note: Sentiment updates are now handled through the unified state stream
    
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

export async function GET(_request: NextRequest) {
  try {
    const battleManager = await BattleManagerDB.getInstance();
    const casts = await battleManager.getCurrentBattleCasts();
    
    return NextResponse.json({ 
      success: true, 
      casts: casts.map(cast => ({
        id: cast.id,
        content: cast.content,
        side: cast.side,
        userAddress: cast.user.address,
        createdAt: cast.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch casts' 
    }, { status: 500 });
  }
}
