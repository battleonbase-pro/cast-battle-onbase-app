import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating production database schema...');
    
    // Check current schema
    console.log('1️⃣ Checking current schema...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Battle' 
      AND column_name IN ('imageUrl', 'thumbnail')
    `;
    
    console.log('Current schema:', result);
    
    // Add missing columns if they don't exist
    console.log('2️⃣ Adding missing columns...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Battle" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`;
      console.log('✅ Added imageUrl column');
    } catch (error: any) {
      console.log('ℹ️ imageUrl column already exists or error:', error.message);
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Battle" ADD COLUMN IF NOT EXISTS "thumbnail" TEXT`;
      console.log('✅ Added thumbnail column');
    } catch (error: any) {
      console.log('ℹ️ thumbnail column already exists or error:', error.message);
    }
    
    // Verify schema update
    console.log('3️⃣ Verifying schema update...');
    const updatedResult = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Battle' 
      AND column_name IN ('imageUrl', 'thumbnail')
    `;
    
    console.log('Updated schema:', updatedResult);
    
    return NextResponse.json({
      success: true,
      message: 'Production schema updated successfully',
      schema: updatedResult
    });
    
  } catch (error: any) {
    console.error('❌ Schema update failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
