const { Client } = require('pg');
require('dotenv').config();

async function checkProductionTables() {
  console.log('🔍 Checking production database tables...');
  
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_D3IEzufLxR0X@ep-mute-mouse-ad8zedq9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=20&connect_timeout=60'
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database');

    // List all tables
    console.log('1️⃣ Listing all tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Available tables:', tablesResult.rows);

    // Check if there's a battle table (case insensitive)
    const battleTables = tablesResult.rows.filter(row => 
      row.table_name.toLowerCase().includes('battle')
    );
    
    if (battleTables.length > 0) {
      console.log('2️⃣ Found battle-related tables:', battleTables);
      
      // Check schema of the first battle table
      const tableName = battleTables[0].table_name;
      console.log(`3️⃣ Checking schema of table: ${tableName}`);
      
      const schemaResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);
      
      console.log(`Schema for ${tableName}:`, schemaResult.rows);
    } else {
      console.log('❌ No battle-related tables found');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await client.end();
  }
}

checkProductionTables();
