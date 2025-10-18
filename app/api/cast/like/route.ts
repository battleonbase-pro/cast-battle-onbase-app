import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/cast/like
 * Like or unlike a cast (argument)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, castId } = body;

    if (!userAddress || !castId) {
      return NextResponse.json({
        success: false,
        error: 'User address and cast ID are required'
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

    // Get the cast to verify it exists and get battleId
    const cast = await prisma.cast.findUnique({
      where: { id: castId },
      include: { battle: true }
    });

    if (!cast) {
      return NextResponse.json({
        success: false,
        error: 'Cast not found'
      }, { status: 404 });
    }

    // Check if user has already liked this cast
    const existingLike = await prisma.castLike.findUnique({
      where: {
        userId_castId: {
          userId: user.id,
          castId: castId
        }
      }
    });

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.castLike.delete({
        where: {
          userId_castId: {
            userId: user.id,
            castId: castId
          }
        }
      });

      // Get updated like count
      const likeCount = await prisma.castLike.count({
        where: { castId: castId }
      });

      console.log(`👎 User ${userAddress} unliked cast ${castId}`);

      return NextResponse.json({
        success: true,
        action: 'unliked',
        likeCount,
        message: 'Cast unliked successfully'
      });
    } else {
      // Like: Create the like
      await prisma.castLike.create({
        data: {
          userId: user.id,
          castId: castId,
          battleId: cast.battleId
        }
      });

      // Get updated like count
      const likeCount = await prisma.castLike.count({
        where: { castId: castId }
      });

      console.log(`👍 User ${userAddress} liked cast ${castId}`);

      return NextResponse.json({
        success: true,
        action: 'liked',
        likeCount,
        message: 'Cast liked successfully'
      });
    }

  } catch (error) {
    console.error('Error liking/unliking cast:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to like/unlike cast'
    }, { status: 500 });
  }
}

/**
 * GET /api/cast/like?castId=...&userAddress=...
 * Get like status and count for a cast
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const castId = searchParams.get('castId');
    const userAddress = searchParams.get('userAddress');

    if (!castId) {
      return NextResponse.json({
        success: false,
        error: 'Cast ID is required'
      }, { status: 400 });
    }

    // Get like count
    const likeCount = await prisma.castLike.count({
      where: { castId: castId }
    });

    let userLiked = false;
    if (userAddress) {
      // Check if user has liked this cast
      const user = await prisma.user.findUnique({
        where: { address: userAddress }
      });

      if (user) {
        const existingLike = await prisma.castLike.findUnique({
          where: {
            userId_castId: {
              userId: user.id,
              castId: castId
            }
          }
        });
        userLiked = !!existingLike;
      }
    }

    return NextResponse.json({
      success: true,
      castId,
      likeCount,
      userLiked
    });

  } catch (error) {
    console.error('Error fetching like status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch like status'
    }, { status: 500 });
  }
}
