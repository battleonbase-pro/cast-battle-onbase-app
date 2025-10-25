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

    // 1. Check nonce hasn't been reused (matches docs recommendation)
    // Extract nonce from SIWE message format: "Nonce: <nonce>"
    const nonceMatch = message.match(/Nonce:\s*([a-f0-9]{32})/i);
    const extracted = nonceMatch?.[1] || null;
    
    console.log('🔍 Nonce extraction:', { 
      message: message.substring(0, 100) + '...', 
      nonceMatch, 
      extracted,
      noncesSize: nonces.size,
      allNonces: Array.from(nonces.keys())
    });
    
    if (!extracted) {
      console.log('❌ No nonce found in message');
      return NextResponse.json({ error: 'No nonce found in message' }, { status: 400 });
    }
    
    // Check if nonce exists (but don't delete it yet - allow multiple attempts)
    if (!nonces.has(extracted)) {
      console.log('❌ Invalid or already used nonce:', extracted);
      return NextResponse.json({ error: 'Invalid or reused nonce' }, { status: 400 });
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

    // 3. Remove nonce after successful verification to prevent reuse
    nonces.delete(extracted);
    console.log('🗑️ Nonce removed after successful verification:', extracted);

    // 4. Create or update user in database
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
