import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { nonces } from '../nonce/route';
import databaseService from '@/lib/services/database';

// Create viem client for Base chain
const client = createPublicClient({ 
  chain: base, 
  transport: http() 
});

export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: address, message, signature' },
        { status: 400 }
      );
    }

    // 1. Check nonce hasn't been reused
    console.log('📝 Message for nonce extraction:', message);
    
    // Try multiple nonce patterns to match different SIWE formats
    const noncePatterns = [
      /Nonce: (\w+)/,           // Standard SIWE format
      /nonce: (\w+)/,           // Lowercase
      /Nonce (\w+)/,            // Without colon
      /nonce (\w+)/,            // Lowercase without colon
      /at (\w{32})$/,           // Pattern from your example
      /Nonce: ([a-f0-9]{32})/,  // Hex pattern
      /nonce: ([a-f0-9]{32})/   // Hex pattern lowercase
    ];
    
    let nonce = null;
    for (const pattern of noncePatterns) {
      const match = message.match(pattern);
      if (match) {
        nonce = match[1];
        console.log('🔍 Found nonce with pattern:', pattern.toString(), 'nonce:', nonce);
        break;
      }
    }
    
    if (!nonce) {
      console.log('❌ No nonce found in message');
      console.log('📝 Available nonces in store:', Array.from(nonces));
      return NextResponse.json(
        { error: 'No nonce found in message' },
        { status: 400 }
      );
    }
    
    console.log('📝 Nonces store before deletion:', Array.from(nonces));
    console.log('📝 Attempting to delete nonce:', nonce);
    
    if (!nonces.delete(nonce)) {
      console.log('❌ Invalid or reused nonce:', nonce);
      console.log('📝 Available nonces in store:', Array.from(nonces));
      return NextResponse.json(
        { error: 'Invalid or reused nonce' },
        { status: 400 }
      );
    }
    
    console.log('📝 Nonces store after deletion:', Array.from(nonces));
    console.log('✅ Nonce validated:', nonce);

    // 2. Verify signature using standard viem approach
    console.log('🔍 Verifying signature with viem client...');
    console.log('📝 Address:', address);
    console.log('📝 Message:', message);
    console.log('📝 Signature:', signature);
    
    const isValid = await client.verifyMessage({
      address: address as `0x${string}`,
      message: message as string,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      console.log('❌ Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    console.log('✅ Signature verified successfully');

    // 3. Create or update user in database
    try {
      console.log('👤 Creating/updating user in database:', address);
      await databaseService.createOrUpdateUser(address);
      console.log('✅ User created/updated successfully');
    } catch (error) {
      console.error('❌ Failed to create/update user:', error);
      // Don't fail authentication if user creation fails
    }

    console.log('✅ SIWE signature verified for address:', address);

    return NextResponse.json({
      success: true,
      message: 'Signature verified successfully',
      address,
    });

  } catch (error) {
    console.error('Error verifying SIWE signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    );
  }
}
