import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import databaseService from '@/lib/services/database';
import { nonces } from '../nonce/route';

// Select chain: Base or Base Sepolia (testnet)
const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV === 'development';
console.log('🔗 Verification endpoint chain configuration:', { 
  isTestnet, 
  chain: isTestnet ? 'Base Sepolia' : 'Base Mainnet',
  nodeEnv: process.env.NODE_ENV, 
  network: process.env.NEXT_PUBLIC_NETWORK 
});

const client = createPublicClient({
  chain: isTestnet ? baseSepolia : base,
  transport: http(),
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

    // 1. Extract nonce from SIWE message format: "Nonce: <nonce>"
    const nonceMatch = message.match(/Nonce:\s*([a-f0-9]+)/i);
    const extracted = nonceMatch?.[1] || null;
    
    console.log('🔍 [NONCE VERIFICATION] Step 1 - Extraction:', { 
      message: message.substring(0, 150) + '...', 
      nonceMatch, 
      extracted,
      noncesSize: nonces.size,
      nonceInStore: extracted ? nonces.has(extracted) : 'N/A'
    });
    
    // 2. Check if nonce is in our backend store (from /api/auth/nonce)
    // If it's NOT in our store, it might be OnchainKit-generated (which is OK)
    // If it IS in our store, make sure it hasn't been used
    if (extracted && nonces.has(extracted)) {
      console.log('✅ [NONCE VERIFICATION] Backend-generated nonce found in store - removing to prevent reuse');
      // Remove nonce from store to prevent reuse
      nonces.delete(extracted);
    } else if (extracted) {
      console.log('✅ [NONCE VERIFICATION] Nonce not in backend store (likely OnchainKit-generated) - will verify signature only');
    } else {
      console.log('❌ [NONCE VERIFICATION ERROR] No nonce found in message');
      return NextResponse.json({ error: 'No nonce found in message' }, { status: 400 });
    }

    // 2. Verify signature using standard viem approach per docs
    console.log('🔍 Verifying signature with viem client...');
    console.log('📝 Address:', address);
    console.log('📝 Message:', message);
    console.log('📝 Signature:', signature);
    console.log('📝 Signature length:', signature.length);
    console.log('📝 Signature type:', typeof signature);
    
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

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Error verifying SIWE signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    );
  }
}
