import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const imagePath = path.join(process.cwd(), 'public', 'og-image.png');
    const imageBuffer = fs.readFileSync(imagePath);
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, immutable, no-transform, max-age=3600',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving og-image:', error);
    return new NextResponse('Image not found', { status: 404 });
  }
}
