import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Use global stores that persist across requests
// In production, use Redis or a database
declare global {
  var __nonces: Map<string, number> | undefined;
  var __usedNonces: Set<string> | undefined;
}

if (!global.__nonces) {
  global.__nonces = new Map<string, number>();
}

if (!global.__usedNonces) {
  global.__usedNonces = new Set<string>();
}

const nonces = global.__nonces;
const usedNonces = global.__usedNonces;

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

export async function GET(request: NextRequest) {
  try {
    // Clean up old nonces first
    cleanupOldNonces();
    
    // Get request metadata for debugging
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    // Generate a 32-character hex nonce (same format as client-side UUID without dashes)
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    nonces.set(nonce, timestamp);
    
    console.log('🔑 [NONCE GENERATION] Details:', {
      nonce,
      timestamp: new Date(timestamp).toISOString(),
      totalNonces: nonces.size,
      userAgent: userAgent?.substring(0, 50),
      referer: referer?.substring(0, 50),
      ip: ip.substring(0, 20),
      stackTrace: new Error().stack?.split('\n').slice(2, 5).join(' | ')
    });
    
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('❌ [NONCE GENERATION ERROR]:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}

// Export the nonces stores so they can be shared with the verify endpoint
export { nonces, usedNonces };
