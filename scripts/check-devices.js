const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDevices() {
  const client = await pool.connect();
  
  try {
    console.log('Checking existing devices...');
    
    const result = await client.query(`
      SELECT id, name, "deviceId", location, "deviceType", "isActive"
      FROM "Device"
      ORDER BY "createdAt" DESC
    `);
    
    console.log(`Found ${result.rows.length} devices:`);
    result.rows.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name} (${device.deviceId}) - ${device.location} - ${device.deviceType}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to check devices:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDevices().catch(console.error); 