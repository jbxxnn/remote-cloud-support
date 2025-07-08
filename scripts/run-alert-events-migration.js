const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/remote_support',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running AlertEvent table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migration-003-add-alert-events-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await client.query(statement);
      }
    }
    
    console.log('✅ AlertEvent table migration completed successfully!');
    console.log('📋 Created:');
    console.log('   - AlertEvent table for tracking workflow');
    console.log('   - Indexes for performance');
    console.log('   - Added status and assignedTo columns to Alert table');
    
    // Verify the migration by checking if the table exists
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'AlertEvent';
    `);
    
    if (result.rows.length > 0) {
      console.log('\n🔍 Verification: AlertEvent table created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 