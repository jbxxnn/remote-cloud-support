const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateAddEvents() {
  const client = await pool.connect();
  
  try {
    console.log('Adding Event and EventAction tables...');

    // Create Event table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Event" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "clientId" TEXT NOT NULL,
        "detectionId" TEXT,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        description TEXT,
        "assignedTo" TEXT,
        "resolvedAt" TIMESTAMP,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE,
        FOREIGN KEY ("detectionId") REFERENCES "Detection"(id) ON DELETE SET NULL,
        FOREIGN KEY ("assignedTo") REFERENCES "User"(id) ON DELETE SET NULL
      )
    `);

    // Create EventAction table for logging staff actions
    await client.query(`
      CREATE TABLE IF NOT EXISTS "EventAction" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "eventId" TEXT NOT NULL,
        "staffId" TEXT NOT NULL,
        action TEXT NOT NULL,
        details JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE,
        FOREIGN KEY ("staffId") REFERENCES "User"(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_client_id ON "Event"("clientId")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_status ON "Event"(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_assigned_to ON "Event"("assignedTo")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_timestamp ON "Event"(timestamp)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_action_event_id ON "EventAction"("eventId")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_action_staff_id ON "EventAction"("staffId")');

    // Create trigger for Event table
    await client.query(`
      CREATE TRIGGER update_event_updated_at 
      BEFORE UPDATE ON "Event" 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create some sample events from existing detections
    console.log('Creating sample events from existing detections...');
    await client.query(`
      INSERT INTO "Event" (
        id, "clientId", "detectionId", type, severity, status, description, timestamp
      )
      SELECT 
        gen_random_uuid()::text,
        d."clientId",
        d.id,
        CASE 
          WHEN d."detectionType" IN ('fall', 'door_open', 'motion') THEN 'detection'
          ELSE 'scheduled'
        END,
        d.severity,
        CASE 
          WHEN d.severity = 'high' THEN 'pending'
          ELSE 'resolved'
        END,
        CONCAT(d."detectionType", ' detected at ', d.location),
        d.timestamp
      FROM "Detection" d
      WHERE d.timestamp >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM "Event" e WHERE e."detectionId" = d.id
      )
    `);

    console.log('✅ Event and EventAction tables created successfully!');
    console.log('✅ Sample events created from recent detections');
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
  migrateAddEvents()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAddEvents }; 