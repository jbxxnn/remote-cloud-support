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
    console.log('Running device table enhancement migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migration-004-enhance-devices-table.sql');
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
        // Some statements might fail if they already exist (like indexes)
        // This is expected behavior for idempotent migrations
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log(`  Statement ${i + 1} skipped (already exists): ${error.message}`);
        } else {
          console.error(`  Error in statement ${i + 1}:`, error);
          throw error;
        }
      } else {
        console.log(`  Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('✅ Device table enhancement migration completed successfully!');
    console.log('');
    console.log('New fields added to Device table:');
    console.log('- aiBehavior (TEXT[]) - AI behaviors or capabilities');
    console.log('- eventTypes (TEXT[]) - Event types this device can trigger');
    console.log('- subjectLineMatch (TEXT) - Text pattern for webhook matching');
    console.log('- homeAssistantEntityId (TEXT) - Home Assistant entity ID');
    console.log('- description (TEXT) - Human-readable description');
    console.log('- manufacturer (TEXT) - Device manufacturer');
    console.log('- model (TEXT) - Device model');
    console.log('- firmwareVersion (TEXT) - Current firmware version');
    console.log('- lastSeen (TIMESTAMP) - Last device activity');
    console.log('- status (TEXT) - Current device status');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 