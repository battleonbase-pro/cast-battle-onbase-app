import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@farcaster/quick-auth';
import databaseService from '@/lib/services/database';

const quickAuthClient = createClient();

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      );
    }

    console.log('🔍 Verifying Quick Auth token...');
    console.log('📝 Token length:', token.length);

    // Verify the JWT token using Quick Auth client
    const payload = await quickAuthClient.verifyJwt({
      token,
      domain: request.headers.get('host') || 'localhost:3000',
    });

    console.log('✅ Quick Auth token verified successfully');
    console.log('📝 Payload:', payload);

    const fid = payload.sub; // FID is in the 'sub' field of the JWT

    // Resolve additional user information
    const userInfo = await resolveUser(fid);
    
    // Create or update user in database
    try {
      console.log('👤 Creating/updating Farcaster user in database:', { fid, ...userInfo });
      await databaseService.createOrUpdateUser(userInfo.primaryAddress, {
        fid,
        username: userInfo.username,
        displayName: userInfo.displayName,
        pfpUrl: userInfo.pfpUrl
      });
      console.log('✅ Farcaster user created/updated successfully');
    } catch (error) {
      console.error('❌ Failed to create/update Farcaster user:', error);
      // Don't fail authentication if user creation fails
    }

    console.log('✅ Farcaster Quick Auth successful for FID:', fid);

    // Return user data
    return NextResponse.json({
      ok: true,
      fid,
      username: userInfo.username,
      displayName: userInfo.displayName,
      pfpUrl: userInfo.pfpUrl,
      address: userInfo.primaryAddress
    });

  } catch (error) {
    console.error('Error verifying Quick Auth token:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}

// Resolve additional information about the authenticated Farcaster user
async function resolveUser(fid: number) {
  try {
    // Get primary Ethereum address
    const primaryAddressRes = await fetch(
      `https://api.farcaster.xyz/fc/primary-address?fid=${fid}&protocol=ethereum`,
    );
    
    let primaryAddress = '';
    if (primaryAddressRes.ok) {
      const { result } = await primaryAddressRes.json<{
        result: {
          address: {
            fid: number;
            protocol: 'ethereum' | 'solana';
            address: string;
          };
        };
      }>();
      primaryAddress = result.address.address;
    }

    // Get user profile information
    const profileRes = await fetch(
      `https://api.farcaster.xyz/fc/user?fid=${fid}`,
    );
    
    let username = '';
    let displayName = '';
    let pfpUrl = '';
    
    if (profileRes.ok) {
      const { result } = await profileRes.json<{
        result: {
          user: {
            username: string;
            display_name: string;
            pfp_url: string;
          };
        };
      }>();
      
      username = result.user.username;
      displayName = result.user.display_name;
      pfpUrl = result.user.pfp_url;
    }

    return {
      fid,
      primaryAddress,
      username,
      displayName,
      pfpUrl
    };
  } catch (error) {
    console.error('Error resolving user info:', error);
    return {
      fid,
      primaryAddress: '',
      username: '',
      displayName: '',
      pfpUrl: ''
    };
  }
}
