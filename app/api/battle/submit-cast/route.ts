import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';
import { broadcastSentimentUpdate } from '../sentiment-stream/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, content, side } = body;
    
    if (!userAddress || !content || !side) {
      return NextResponse.json({ 
        error: 'Missing required fields: userAddress, content, side' 
      }, { status: 400 });
    }
    
    if (!['SUPPORT', 'OPPOSE'].includes(side)) {
      return NextResponse.json({ 
        error: 'Side must be either SUPPORT or OPPOSE' 
      }, { status: 400 });
    }
    
    if (content.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Cast content must be at least 10 characters long' 
      }, { status: 400 });
    }
    
    const battleManager = BattleManagerDB.getInstance();
    
    // Check if user is a participant in the current battle
    const currentBattle = await battleManager.getCurrentBattle();
    if (!currentBattle) {
      return NextResponse.json({ 
        error: 'No active battle available' 
      }, { status: 404 });
    }
    
    // Check if user has already joined the battle
    const isParticipant = currentBattle.participants.some(p => p.user.address === userAddress);
    if (!isParticipant) {
      return NextResponse.json({ 
        error: 'You must join the battle before submitting arguments' 
      }, { status: 403 });
    }
    
    // Create the cast
    const cast = await battleManager.createCast(userAddress, content.trim(), side);
    
    // Broadcast sentiment update to all connected clients
    await broadcastSentimentUpdate(currentBattle.id, userAddress);
    
    return NextResponse.json({ 
      success: true, 
      cast: {
        id: cast.id,
        content: cast.content,
        side: cast.side,
        createdAt: cast.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error submitting cast:', error);
    return NextResponse.json({ 
      error: 'Failed to submit cast' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
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
