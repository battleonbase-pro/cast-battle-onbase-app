import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Use a global nonces store that persists across requests
// In production, use Redis or a database
declare global {
  var __nonces: Map<string, number> | undefined;
}

if (!global.__nonces) {
  global.__nonces = new Map<string, number>();
}

const nonces = global.__nonces;

// Clean up nonces older than 5 minutes
const cleanupOldNonces = () => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  for (const [nonce, timestamp] of nonces.entries()) {
    if (timestamp < fiveMinutesAgo) {
      nonces.delete(nonce);
      console.log('🗑️ Cleaned up old nonce:', nonce);
    }
  }
};

export async function GET() {
  try {
    // Clean up old nonces first
    cleanupOldNonces();
    
    // Generate a 32-character hex nonce (same format as client-side UUID without dashes)
    const nonce = crypto.randomBytes(16).toString('hex');
    nonces.set(nonce, Date.now());
    
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
