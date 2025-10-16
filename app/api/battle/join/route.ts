import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let userAddress: string | undefined;
  
  try {
    const body = await request.json();
    const { userAddress: address } = body;
    userAddress = address;
    
    if (!userAddress) {
      console.log(`❌ Invalid join battle attempt - missing userAddress`);
      return NextResponse.json({ 
        error: 'Missing required field: userAddress' 
      }, { status: 400 });
    }
    
    const battleManager = await BattleManagerDB.getInstance();
    
    // Join the current battle
    const success = await battleManager.joinBattle(userAddress);
    
    if (success) {
      console.log(`✅ User ${userAddress} successfully joined battle`);
      return NextResponse.json({ 
        success: true,
        message: 'Successfully joined battle'
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to join battle' 
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error joining battle:', error);
    console.log(`❌ User ${userAddress || 'unknown'} failed to join battle: ${errorMessage}`);
    return NextResponse.json({ 
      error: errorMessage || 'Failed to join battle' 
    }, { status: 500 });
  }
}
