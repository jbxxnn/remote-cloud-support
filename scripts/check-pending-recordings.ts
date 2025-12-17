/**
 * Debug Script: Check Pending Recordings
 * 
 * This script helps verify what recordings exist in the database
 * and why they might not be picked up by polling
 * 
 * Usage:
 *   tsx scripts/check-pending-recordings.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file explicitly (must be before importing database)
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env.local');
  console.error('Current working directory:', process.cwd());
  console.error('Looking for .env.local at:', resolve(process.cwd(), '.env.local'));
  process.exit(1);
}

console.log('✅ DATABASE_URL loaded');
console.log('');

async function checkRecordings() {
  try {
    // Import database after env is loaded
    const { query } = await import('../src/lib/database');
    
    console.log('🔍 Checking recordings in database...\n');

    // Get ALL recordings (not just pending)
    const allRecordings = await query(`
      SELECT 
        id,
        "source",
        "processingStatus",
        "meetingId",
        "meetingUrl",
        "createdAt",
        "videoDriveFileId",
        "transcriptDriveFileId",
        "alertId",
        "clientId"
      FROM "Recording"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    console.log(`📊 Total recordings found: ${allRecordings.rows.length}\n`);

    if (allRecordings.rows.length === 0) {
      console.log('❌ No recordings found in database at all.');
      console.log('   Make sure you have created a recording by clicking "Start Call" in an alert.');
      return;
    }

    // Group by status
    const byStatus = allRecordings.rows.reduce((acc: any, rec: any) => {
      const status = rec.processingStatus || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(rec);
      return acc;
    }, {});

    console.log('📈 Recordings by status:');
    Object.entries(byStatus).forEach(([status, records]: [string, any]) => {
      console.log(`   ${status}: ${records.length}`);
    });
    console.log('');

    // Show Google Meet recordings specifically
    const googleMeetRecordings = allRecordings.rows.filter(
      (r: any) => r.source === 'google_meet'
    );

    console.log(`🎥 Google Meet recordings: ${googleMeetRecordings.length}`);
    
    if (googleMeetRecordings.length === 0) {
      console.log('   ⚠️  No Google Meet recordings found.');
      console.log('   Make sure you clicked "Start Call" which creates a recording with source="google_meet"');
    } else {
      console.log('\n📋 Google Meet Recording Details:');
      googleMeetRecordings.forEach((rec: any, index: number) => {
        console.log(`\n   ${index + 1}. Recording ID: ${rec.id}`);
        console.log(`      Status: ${rec.processingStatus}`);
        console.log(`      Created: ${rec.createdAt}`);
        console.log(`      Meeting ID: ${rec.meetingId || 'N/A'}`);
        console.log(`      Meeting URL: ${rec.meetingUrl || 'N/A'}`);
        console.log(`      Video Drive ID: ${rec.videoDriveFileId || 'Not set'}`);
        console.log(`      Transcript Drive ID: ${rec.transcriptDriveFileId || 'Not set'}`);
        console.log(`      Alert ID: ${rec.alertId || 'N/A'}`);
        console.log(`      Client ID: ${rec.clientId || 'N/A'}`);
      });
    }

    // Check what polling would find
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
    console.log(`\n🔎 Polling Query Check:`);
    console.log(`   Looking for recordings created after: ${cutoffTime.toISOString()}`);
    
    const pollingQuery = await query(`
      SELECT id, "meetingId", "createdAt", "processingStatus"
      FROM "Recording"
      WHERE "source" = 'google_meet' 
        AND "processingStatus" = 'pending'
        AND "createdAt" >= $1
      ORDER BY "createdAt" DESC
      LIMIT 50
    `, [cutoffTime]);

    console.log(`   Found by polling query: ${pollingQuery.rows.length} recordings\n`);

    if (pollingQuery.rows.length === 0) {
      console.log('❌ Polling query found no recordings. Reasons could be:');
      console.log('   1. No recordings with source="google_meet"');
      console.log('   2. No recordings with processingStatus="pending"');
      console.log('   3. Recordings are older than 5 minutes (polling only checks recent ones)');
      console.log('\n💡 To test polling:');
      console.log('   1. Create a NEW recording (click "Start Call" in an alert)');
      console.log('   2. Wait less than 5 minutes');
      console.log('   3. Run polling again');
    } else {
      console.log('✅ Polling query would find these recordings:');
      pollingQuery.rows.forEach((rec: any) => {
        console.log(`   - ${rec.id} (created: ${rec.createdAt})`);
      });
    }

    // Show recent recordings regardless of status
    const recentRecordings = allRecordings.rows.filter((rec: any) => {
      const createdAt = new Date(rec.createdAt);
      return createdAt >= cutoffTime;
    });

    if (recentRecordings.length > 0) {
      console.log(`\n⏰ Recent recordings (last 5 minutes): ${recentRecordings.length}`);
      recentRecordings.forEach((rec: any) => {
        console.log(`   - ${rec.id}: source=${rec.source}, status=${rec.processingStatus}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking recordings:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

checkRecordings();

