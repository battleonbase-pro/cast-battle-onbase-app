import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to Farcaster hosted manifest with 307 status
  return NextResponse.redirect(
    'https://api.farcaster.xyz/miniapps/hosted-manifest/0199c011-193b-ca61-a963-36fbfaef8937',
    { status: 307 }
  );
}
