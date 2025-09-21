import { NextRequest, NextResponse } from 'next/server';
import { BattleManagerDB } from '@/lib/services/battle-manager-db';

/**
 * POST /api/battle/manage
 * Initialize battle manager and create battles automatically
 */
export async function POST(_request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    
    // Initialize the battle manager
    await battleManager.initialize();

    return NextResponse.json({
      success: true,
      message: 'Battle manager initialized successfully',
      config: battleManager.getConfig()
    });

  } catch (error) {
    console.error('Error initializing battle manager:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize battle manager'
    }, { status: 500 });
  }
}

/**
 * GET /api/battle/manage
 * Get battle manager status and configuration
 */
export async function GET(_request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    const currentBattle = await battleManager.getCurrentBattle();
    const config = battleManager.getConfig();

    return NextResponse.json({
      success: true,
      currentBattle,
      config,
      status: currentBattle ? 'active' : 'no_battle'
    });

  } catch (error) {
    console.error('Error fetching battle manager status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch battle manager status'
    }, { status: 500 });
  }
}

/**
 * PUT /api/battle/manage
 * Update battle manager configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    const battleManager = BattleManagerDB.getInstance();
    
    battleManager.updateConfig(updates);

    return NextResponse.json({
      success: true,
      message: 'Battle configuration updated',
      config: battleManager.getConfig()
    });

  } catch (error) {
    console.error('Error updating battle configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update battle configuration'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/battle/manage
 * Manually trigger battle generation (for testing/admin purposes)
 */
export async function DELETE(_request: NextRequest) {
  try {
    const battleManager = BattleManagerDB.getInstance();
    
    // Manually trigger battle generation
    await battleManager.triggerBattleGeneration();
    
    const currentBattle = await battleManager.getCurrentBattle();

    return NextResponse.json({
      success: true,
      message: 'Battle generation triggered successfully',
      currentBattle
    });

  } catch (error) {
    console.error('Error triggering battle generation:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to trigger battle generation'
    }, { status: 500 });
  }
}
