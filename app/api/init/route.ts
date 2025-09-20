import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

/**
 * POST /api/init
 * Initialize the application and battle manager
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Initializing Cast Battle application...');
    
    // Initialize battle manager
    const battleManager = BattleManagerDB.getInstance();
    await battleManager.initialize();
    
    const config = battleManager.getConfig();
    const currentBattle = await battleManager.getCurrentBattle();
    
    console.log('Application initialized successfully');
    console.log('Battle generation interval:', config.battleDurationHours, 'hours');
    console.log('Battle generation enabled:', config.enabled);
    
    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully',
      config,
      currentBattle: currentBattle ? {
        id: currentBattle.id,
        status: currentBattle.status,
        topic: currentBattle.topic?.title,
        participants: currentBattle.participants.length,
        endTime: currentBattle.endTime
      } : null
    });

  } catch (error) {
    console.error('Error initializing application:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize application'
    }, { status: 500 });
  }
}

/**
 * GET /api/init
 * Get application status
 */
export async function GET(request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    const config = battleManager.getConfig();
    const currentBattle = await battleManager.getCurrentBattle();
    
    return NextResponse.json({
      success: true,
      status: 'running',
      config,
      currentBattle: currentBattle ? {
        id: currentBattle.id,
        status: currentBattle.status,
        topic: currentBattle.topic?.title,
        participants: currentBattle.participants.length,
        endTime: currentBattle.endTime
      } : null
    });

  } catch (error) {
    console.error('Error fetching application status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch application status'
    }, { status: 500 });
  }
}
