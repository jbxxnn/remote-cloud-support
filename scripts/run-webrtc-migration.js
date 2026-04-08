const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration: migration-019-add-webrtc-calls.sql...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migration-019-add-webrtc-calls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration by checking if the tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('CallSession', 'CallParticipant', 'CallEvent', 'CallRecording')
      ORDER BY table_name;
    `);
    
    console.log('\n🔍 Verification: Found tables:', tablesResult.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
