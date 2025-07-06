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
    console.log('🔄 Running migration: Add new client fields...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migration-001-add-client-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added the following fields to Client table:');
    console.log('   - address');
    console.log('   - timezone');
    console.log('   - emergencyContact');
    console.log('   - emergencyServicesNumber');
    console.log('   - serviceProviderId');
    
    // Verify the migration by checking if the columns exist
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Client' 
      AND column_name IN ('address', 'timezone', 'emergencyContact', 'emergencyServicesNumber', 'serviceProviderId')
      ORDER BY column_name;
    `);
    
    console.log('\n🔍 Verification: Found columns:', result.rows.map(row => row.column_name));
    
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