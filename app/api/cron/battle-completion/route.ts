import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

// Force Node.js runtime for battle management
export const runtime = 'nodejs';

/**
 * GET /api/cron/battle-completion
 * Vercel cron job to automatically complete expired battles
 * Runs every 5 minutes to ensure battles complete on time
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Cron job triggered: Checking for expired battles...');
    
    const battleManager = await BattleManagerDB.getInstance();
    
    // Check and complete any expired battles
    await battleManager.checkAndCompleteExpiredBattles();
    
    console.log('✅ Cron job completed: Battle completion check finished');
    
    return NextResponse.json({
      success: true,
      message: 'Battle completion check completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Battle completion check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
