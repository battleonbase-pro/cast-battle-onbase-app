import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle the specific farcaster.json redirect
  if (request.nextUrl.pathname === '/.well-known/farcaster.json') {
    console.log('Middleware: Redirecting to Farcaster hosted manifest');
    
    return NextResponse.redirect(
      'https://api.farcaster.xyz/miniapps/hosted-manifest/0199c011-193b-ca61-a963-36fbfaef8937',
      {
        status: 307,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Last-Modified': new Date().toUTCString(),
          'ETag': `"${Date.now()}"`,
        }
      }
    );
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/.well-known/farcaster.json'
  ]
};
