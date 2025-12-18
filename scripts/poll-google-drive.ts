/**
 * Google Drive Polling Script
 * 
 * Polls Google Drive for new Google Meet recordings and processes them
 * Useful for development when webhooks aren't available
 * 
 * Usage:
 *   npm run poll:drive
 *   tsx scripts/poll-google-drive.js --interval=5 --max-results=50
 * 
 * Note: This script must be run with tsx to handle TypeScript imports
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file explicitly
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env.local');
  console.error('Please add DATABASE_URL to your .env.local file:');
  console.error('DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

const POLL_INTERVAL_MINUTES = parseInt(
  process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '5',
  10
);
const MAX_RESULTS = parseInt(
  process.argv.find(arg => arg.startsWith('--max-results='))?.split('=')[1] || '50',
  10
);

async function poll() {
  try {
    console.log(`[${new Date().toISOString()}] Polling for new recordings...`);
    
    // Import the polling service directly (bypasses API authentication)
    const { pollForNewRecordings } = await import('../src/lib/google-drive/polling-service');
    
    const stats = await pollForNewRecordings({
      intervalMinutes: POLL_INTERVAL_MINUTES,
      maxResults: MAX_RESULTS,
    });
    
    console.log(`[${new Date().toISOString()}] ✅ Polling complete`);
    console.log(`   Checked: ${stats.checked}, Processed: ${stats.processed}, Errors: ${stats.errors}`);
    
    if (stats.processed > 0) {
      console.log(`   🎉 Successfully processed ${stats.processed} recording(s)!`);
    } else if (stats.checked === 0) {
      console.log(`   ℹ️  No pending recordings found`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[${new Date().toISOString()}] ❌ Error polling:`, errorMessage);
    if (errorStack) {
      console.error(errorStack);
    }
  }
}

// Poll immediately
poll();

// Then poll at intervals
const interval = setInterval(poll, POLL_INTERVAL_MINUTES * 60 * 1000);

console.log(`Polling started. Will check every ${POLL_INTERVAL_MINUTES} minutes.`);
console.log('Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping polling...');
  clearInterval(interval);
  process.exit(0);
});

