import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Use a global nonces store that persists across requests
// In production, use Redis or a database
declare global {
  var __nonces: Set<string> | undefined;
}

if (!global.__nonces) {
  global.__nonces = new Set<string>();
}

const nonces = global.__nonces;

export async function GET() {
  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    nonces.add(nonce);
    
    console.log('🔑 Generated nonce:', nonce);
    console.log('📝 Total nonces in store:', nonces.size);
    
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}

// Export the nonces set so it can be shared with the verify endpoint
export { nonces };
