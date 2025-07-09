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
    console.log('Running nullable clientId migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migration-006-allow-null-clientid.sql');
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
        console.error(`  Error in statement ${i + 1}:`, error);
        throw error;
      } else {
        console.log(`  Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('✅ Nullable clientId migration completed successfully!');
    console.log('');
    console.log('Changes made:');
    console.log('- Made clientId column nullable in Device table');
    console.log('- Devices can now be global (clientId = null) or assigned to specific clients');
    console.log('');
    console.log('Updated Device table structure:');
    console.log('- id (TEXT PRIMARY KEY)');
    console.log('- clientId (TEXT, nullable) - can be null for global devices');
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