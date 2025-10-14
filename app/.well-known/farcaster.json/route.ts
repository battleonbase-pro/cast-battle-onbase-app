import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('API Route: Redirecting to Farcaster hosted manifest');
  
  // Create a response with explicit headers
  const response = new Response(null, {
    status: 307,
    headers: {
      'Location': 'https://api.farcaster.xyz/miniapps/hosted-manifest/0199c011-193b-ca61-a963-36fbfaef8937',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${Date.now()}"`,
      'X-API-Redirect': 'true',
      'X-API-Timestamp': new Date().toISOString(),
    }
  });
  
  return response;
}