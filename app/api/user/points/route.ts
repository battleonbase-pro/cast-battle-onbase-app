import { NextRequest, NextResponse } from 'next/server';
import databaseService from '@/lib/services/database';

/**
 * GET /api/user/points?address=0x...
 * Get user points
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'User address is required'
      }, { status: 400 });
    }

    let points = 0;
    
    try {
      points = await databaseService.getUserPoints(address);
    } catch (dbError) {
      console.warn('Database not available for user points, using fallback:', dbError);
      // Fallback: Return 0 points for new users
      points = 0;
    }

    return NextResponse.json({
      success: true,
      address,
      points
    });

  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user points'
    }, { status: 500 });
  }
}

