const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running device table simplification migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migration-005-simplify-device-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Some statements might fail if they don't exist (like indexes)
        // This is expected behavior for idempotent migrations
        if (error.message.includes('does not exist') || error.message.includes('not found')) {
          console.log(`  Statement ${i + 1} skipped (does not exist): ${error.message}`);
        } else {
          console.error(`  Error in statement ${i + 1}:`, error);
          throw error;
        }
      } else {
        console.log(`  Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('✅ Device table simplification migration completed successfully!');
    console.log('');
    console.log('Removed fields from Device table:');
    console.log('- aiBehavior (TEXT[])');
    console.log('- eventTypes (TEXT[])');
    console.log('- subjectLineMatch (TEXT)');
    console.log('- homeAssistantEntityId (TEXT)');
    console.log('- description (TEXT)');
    console.log('- manufacturer (TEXT)');
    console.log('- model (TEXT)');
    console.log('- firmwareVersion (TEXT)');
    console.log('- lastSeen (TIMESTAMP)');
    console.log('- status (TEXT)');
    console.log('');
    console.log('Remaining fields:');
    console.log('- id (TEXT PRIMARY KEY)');
    console.log('- clientId (TEXT NOT NULL)');
    console.log('- name (TEXT NOT NULL)');
    console.log('- deviceId (TEXT NOT NULL)');
    console.log('- location (TEXT)');
    console.log('- deviceType (TEXT DEFAULT "camera")');
    console.log('- isActive (BOOLEAN DEFAULT true)');
    console.log('- metadata (JSONB)');
    console.log('- createdAt (TIMESTAMP)');
    console.log('- updatedAt (TIMESTAMP)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 