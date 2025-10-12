const { Client } = require('pg');
require('dotenv').config();

async function checkBattlesTableSchema() {
  console.log('🔍 Checking battles table schema...');
  
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_D3IEzufLxR0X@ep-mute-mouse-ad8zedq9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=20&connect_timeout=60'
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database');

    // Check schema of the battles table
    console.log('1️⃣ Checking schema of battles table...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'battles'
      ORDER BY ordinal_position
    `);
    
    console.log('Schema for battles table:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check if imageUrl and thumbnail columns exist
    const imageColumns = schemaResult.rows.filter(row => 
      row.column_name.toLowerCase().includes('image') || 
      row.column_name.toLowerCase().includes('thumbnail')
    );
    
    console.log('\n2️⃣ Image-related columns:');
    if (imageColumns.length > 0) {
      imageColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('  ❌ No image-related columns found');
    }
    
  } catch (error) {
    console.error('❌ Error checking battles table:', error);
  } finally {
    await client.end();
  }
}

checkBattlesTableSchema();
