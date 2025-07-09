const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestClient() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test client with API key...');
    
    // Check if client already exists
    const existingClient = await client.query(
      'SELECT id FROM "Client" WHERE "apiKey" = $1',
      ['6630db19-0f12-4980-81d0-4d920577bca2']
    );
    
    if (existingClient.rows.length > 0) {
      console.log('✅ Test client already exists');
      return;
    }
    
    // Create new test client
    const result = await client.query(`
      INSERT INTO "Client" (
        id, name, email, phone, company, "apiKey", "webhookUrl", "isActive", status, "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, 
        'Test Client', 
        'test@example.com', 
        '+1234567890', 
        'Test Company', 
        '6630db19-0f12-4980-81d0-4d920577bca2', 
        'https://example.com/webhook', 
        true, 
        'active', 
        NOW(), 
        NOW()
      )
      RETURNING *
    `);
    
    console.log('✅ Test client created successfully!');
    console.log('Client ID:', result.rows[0].id);
    console.log('API Key:', result.rows[0].apiKey);
    
  } catch (error) {
    console.error('❌ Failed to create test client:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestClient().catch(console.error); 