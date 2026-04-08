const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Checking database schema for call recording columns...');

    // Update CallRecording table to include analysis columns
    await client.query(`
      ALTER TABLE "CallRecording" 
      ADD COLUMN IF NOT EXISTS "analysisResults" JSONB,
      ADD COLUMN IF NOT EXISTS "sentiment" TEXT,
      ADD COLUMN IF NOT EXISTS "sopFollowed" BOOLEAN;
    `);

    console.log('✅ Database schema updated successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
