const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateAddAcknowledgedColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding acknowledgedAt column to Event table...');
    
    // Check if acknowledgedAt column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Event' AND column_name = 'acknowledgedAt'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Adding acknowledgedAt column to Event table...');
      await client.query(`
        ALTER TABLE "Event" 
        ADD COLUMN "acknowledgedAt" TIMESTAMP
      `);
      console.log('✅ acknowledgedAt column added successfully');
    } else {
      console.log('ℹ️ acknowledgedAt column already exists');
    }
    
    console.log('✅ Event table migration completed successfully');
    
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
  migrateAddAcknowledgedColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAddAcknowledgedColumn }; 