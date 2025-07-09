const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up test data for webhook...');
    
    // 1. Create test client if it doesn't exist
    console.log('1. Checking/creating test client...');
    let testClient = await client.query(
      'SELECT * FROM "Client" WHERE "apiKey" = $1',
      ['6630db19-0f12-4980-81d0-4d920577bca2']
    );
    
    if (testClient.rows.length === 0) {
      console.log('Creating test client...');
      const clientResult = await client.query(`
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
      testClient = clientResult;
      console.log('✅ Test client created');
    } else {
      console.log('✅ Test client already exists');
    }
    
    // 2. Create test device if it doesn't exist
    console.log('2. Checking/creating test device...');
    let testDevice = await client.query(
      'SELECT * FROM "Device" WHERE "deviceId" = $1',
      ['camera_001']
    );
    
    if (testDevice.rows.length === 0) {
      console.log('Creating test device...');
      const deviceResult = await client.query(`
        INSERT INTO "Device" (
          id, name, "deviceId", location, "deviceType", "isActive", metadata, "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text, 
          'Test Camera', 
          'camera_001', 
          'Living Room', 
          'camera', 
          true, 
          '{"resolution": "1080p", "fps": 30}', 
          NOW(), 
          NOW()
        )
        RETURNING *
      `);
      testDevice = deviceResult;
      console.log('✅ Test device created');
    } else {
      console.log('✅ Test device already exists');
    }
    
    console.log('\n🎉 Test data setup complete!');
    console.log('Client ID:', testClient.rows[0].id);
    console.log('Device ID:', testDevice.rows[0].id);
    console.log('API Key:', testClient.rows[0].apiKey);
    console.log('Device Device ID:', testDevice.rows[0].deviceId);
    
    console.log('\nYou can now test the webhook with:');
    console.log('Device ID: camera_001');
    console.log('API Key: 6630db19-0f12-4980-81d0-4d920577bca2');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupTestData().catch(console.error); 