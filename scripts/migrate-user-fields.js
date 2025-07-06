const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateUserFields() {
  const client = await pool.connect();
  
  try {
    console.log('Starting User table migration...');
    
    // Check if phone column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'phone'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Adding phone column to User table...');
      await client.query(`
        ALTER TABLE "User" 
        ADD COLUMN phone TEXT
      `);
      console.log('✅ Phone column added successfully');
    } else {
      console.log('ℹ️ Phone column already exists');
    }
    
    console.log('✅ User table migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUserFields()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateUserFields }; 