import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/share/reward
 * Award points for sharing a battle on social media
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, battleId, platform = 'twitter' } = body;

    if (!userAddress || !battleId) {
      return NextResponse.json({
        success: false,
        error: 'User address and battle ID are required'
      }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: userAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { address: userAddress }
      });
    }

    // Check if user has already shared this battle on this platform
    const existingShare = await prisma.shareReward.findUnique({
      where: {
        userId_battleId_platform: {
          userId: user.id,
          battleId: battleId,
          platform: platform
        }
      }
    });

    if (existingShare) {
      return NextResponse.json({
        success: false,
        error: 'You have already shared this battle on this platform',
        points: user.points
      }, { status: 400 });
    }

    // Verify battle exists and is active
    const battle = await prisma.battle.findUnique({
      where: { id: battleId }
    });

    if (!battle) {
      return NextResponse.json({
        success: false,
        error: 'Battle not found'
      }, { status: 404 });
    }

    if (battle.status !== 'ACTIVE') {
      return NextResponse.json({
        success: false,
        error: 'Battle is not active'
      }, { status: 400 });
    }

    // Award points and create share record
    const shareReward = await prisma.shareReward.create({
      data: {
        userId: user.id,
        battleId: battleId,
        platform: platform,
        points: 20
      }
    });

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: 20 } }
    });

    console.log(`🎉 User ${userAddress} earned 20 points for sharing battle ${battleId} on ${platform}`);

    return NextResponse.json({
      success: true,
      message: `You earned 20 points for sharing on ${platform}!`,
      points: updatedUser.points,
      shareReward: {
        id: shareReward.id,
        platform: shareReward.platform,
        points: shareReward.points,
        sharedAt: shareReward.sharedAt
      }
    });

  } catch (error) {
    console.error('Error processing share reward:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process share reward'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/share/reward?userAddress=0x...&battleId=...
 * Check if user has already shared a battle
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const battleId = searchParams.get('battleId');
    const platform = searchParams.get('platform') || 'twitter';

    if (!userAddress || !battleId) {
      return NextResponse.json({
        success: false,
        error: 'User address and battle ID are required'
      }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { address: userAddress }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        hasShared: false,
        canShare: true
      });
    }

    // Check if user has already shared this battle on this platform
    const existingShare = await prisma.shareReward.findUnique({
      where: {
        userId_battleId_platform: {
          userId: user.id,
          battleId: battleId,
          platform: platform
        }
      }
    });

    return NextResponse.json({
      success: true,
      hasShared: !!existingShare,
      canShare: !existingShare,
      shareReward: existingShare ? {
        id: existingShare.id,
        platform: existingShare.platform,
        points: existingShare.points,
        sharedAt: existingShare.sharedAt
      } : null
    });

  } catch (error) {
    console.error('Error checking share status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check share status'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
