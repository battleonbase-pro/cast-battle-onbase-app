import { NextRequest, NextResponse } from 'next/server';
import { verifySignInMessage } from '@farcaster/auth-client';
import databaseService from '@/lib/services/database';

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Missing message or signature' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying Farcaster signature...');
    console.log('📝 Message:', message);
    console.log('📝 Signature length:', signature.length);

    // Verify the signature using Farcaster auth client
    const verificationResult = await verifySignInMessage(message, signature);
    
    if (!verificationResult.isValid) {
      console.log('❌ Farcaster signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ Farcaster signature verified successfully');
    console.log('📝 Verification result:', verificationResult);

    // Extract user data from the verification result
    const { fid, username, displayName, pfpUrl, address } = verificationResult;

    // Create or update user in database
    try {
      console.log('👤 Creating/updating Farcaster user in database:', { fid, username, address });
      await databaseService.createOrUpdateUser(address, {
        fid,
        username,
        displayName,
        pfpUrl
      });
      console.log('✅ Farcaster user created/updated successfully');
    } catch (error) {
      console.error('❌ Failed to create/update Farcaster user:', error);
      // Don't fail authentication if user creation fails
    }

    console.log('✅ Farcaster authentication successful for FID:', fid);

    // Return user data
    return NextResponse.json({
      ok: true,
      fid,
      username,
      displayName,
      pfpUrl,
      address
    });

  } catch (error) {
    console.error('Error verifying Farcaster signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    );
  }
}
