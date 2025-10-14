import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Redirecting to Farcaster hosted manifest');
  
  // Redirect to Farcaster hosted manifest with 307 status
  const response = NextResponse.redirect(
    'https://api.farcaster.xyz/miniapps/hosted-manifest/0199c011-193b-ca61-a963-36fbfaef8937',
    { status: 307 }
  );
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}
