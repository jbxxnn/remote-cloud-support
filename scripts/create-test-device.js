const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestDevice() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test device...');
    
    // Check if device already exists
    const existingDevice = await client.query(
      'SELECT id FROM "Device" WHERE "deviceId" = $1',
      ['camera_001']
    );
    
    if (existingDevice.rows.length > 0) {
      console.log('✅ Test device already exists');
      return;
    }
    
    // Create new test device
    const result = await client.query(`
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
    
    console.log('✅ Test device created successfully!');
    console.log('Device ID:', result.rows[0].id);
    console.log('Device Device ID:', result.rows[0].deviceId);
    
  } catch (error) {
    console.error('❌ Failed to create test device:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestDevice().catch(console.error); 