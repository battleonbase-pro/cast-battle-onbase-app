import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Regenerating Prisma client in production...');
    
    // Run prisma generate to regenerate the client
    const { stdout, stderr } = await execAsync('npx prisma generate');
    
    console.log('Prisma generate output:', stdout);
    if (stderr) {
      console.log('Prisma generate stderr:', stderr);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Prisma client regenerated successfully',
      output: stdout,
      error: stderr
    });
    
  } catch (error: any) {
    console.error('❌ Failed to regenerate Prisma client:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
