const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkClients() {
  const client = await pool.connect();
  
  try {
    console.log('Checking existing clients...');
    
    const result = await client.query(`
      SELECT id, name, email, "apiKey", "isActive", status
      FROM "Client"
      ORDER BY "createdAt" DESC
    `);
    
    console.log(`Found ${result.rows.length} clients:`);
    result.rows.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (${client.email}) - API Key: ${client.apiKey} - Status: ${client.status}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to check clients:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkClients().catch(console.error); 