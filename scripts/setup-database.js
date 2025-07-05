const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Creating tables...');
    await pool.query(schemaSQL);
    console.log('✅ Tables created successfully');
    
    // Read and execute seed data
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    console.log('Inserting seed data...');
    await pool.query(seedSQL);
    console.log('✅ Seed data inserted successfully');
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 