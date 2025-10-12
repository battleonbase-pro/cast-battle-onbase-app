const { Client } = require('pg');
require('dotenv').config();

async function updateProductionSchema() {
  console.log('🔄 Updating production database schema...');
  
  // Use the production database URL from the logs
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_D3IEzufLxR0X@ep-mute-mouse-ad8zedq9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=20&connect_timeout=60'
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database');

    // Check current schema
    console.log('1️⃣ Checking current schema...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Battle' 
      AND column_name IN ('imageUrl', 'thumbnail')
    `);
    
    console.log('Current schema:', result.rows);

    // Add missing columns
    console.log('2️⃣ Adding missing columns...');
    
    try {
      await client.query(`ALTER TABLE "Battle" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`);
      console.log('✅ Added imageUrl column');
    } catch (error) {
      console.log('ℹ️ imageUrl column already exists or error:', error.message);
    }
    
    try {
      await client.query(`ALTER TABLE "Battle" ADD COLUMN IF NOT EXISTS "thumbnail" TEXT`);
      console.log('✅ Added thumbnail column');
    } catch (error) {
      console.log('ℹ️ thumbnail column already exists or error:', error.message);
    }

    // Verify schema update
    console.log('3️⃣ Verifying schema update...');
    const updatedResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Battle' 
      AND column_name IN ('imageUrl', 'thumbnail')
    `);
    
    console.log('Updated schema:', updatedResult.rows);
    
    console.log('✅ Production schema update completed!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
  } finally {
    await client.end();
  }
}

updateProductionSchema();
