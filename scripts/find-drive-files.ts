/**
 * Debug Script: Find Files in Google Drive
 * 
 * This script helps debug why files aren't being found in Google Drive
 * 
 * Usage:
 *   tsx scripts/find-drive-files.ts [recording-id]
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

async function findFiles() {
  try {
    // Import modules after env is loaded
    const { query } = await import('../src/lib/database');
    const { findRecordingFiles, listMeetRecordings } = await import('../src/lib/google-drive/drive-service');
    
    const recordingId = process.argv[2];
    
    if (!recordingId) {
      console.log('📋 Listing all recent Google Meet recordings in Drive...\n');
      
      const recordings = await listMeetRecordings(20);
      
      if (recordings.length === 0) {
        console.log('❌ No Google Meet recordings found in Drive');
        console.log('\n💡 Make sure:');
        console.log('   1. You recorded a Google Meet meeting');
        console.log('   2. The recording was saved to Google Drive');
        console.log('   3. The account used for Drive API has access to the files');
        return;
      }
      
      console.log(`✅ Found ${recordings.length} recordings in Drive:\n`);
      recordings.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.name}`);
        console.log(`   ID: ${rec.id}`);
        console.log(`   Created: ${rec.createdTime}`);
        console.log(`   Size: ${rec.size || 'N/A'}`);
        console.log(`   Link: ${rec.webViewLink || 'N/A'}`);
        console.log('');
      });
      
      return;
    }

    // Get recording from database
    const recordingResult = await query(
      'SELECT * FROM "Recording" WHERE id = $1',
      [recordingId]
    );

    if (recordingResult.rows.length === 0) {
      console.error(`❌ Recording ${recordingId} not found in database`);
      process.exit(1);
    }

    const recording = recordingResult.rows[0];
    
    console.log(`🔍 Searching for files for recording: ${recordingId}\n`);
    console.log(`   Meeting ID: ${recording.meetingId || 'N/A'}`);
    console.log(`   Created: ${recording.createdAt}`);
    console.log(`   Meeting URL: ${recording.meetingUrl || 'N/A'}`);
    console.log(`   Alert ID: ${recording.alertId || 'N/A'}\n`);

    // Try to find files
    const meetingStartTime = recording.createdAt ? new Date(recording.createdAt) : undefined;
    const timeWindow = 30; // 30 minutes
    
    console.log(`   Searching in time window: ${timeWindow} minutes around meeting start`);
    console.log(`   Looking in "Meet Recordings" folder\n`);

    const files = await findRecordingFiles(
      recording.meetingId || '',
      meetingStartTime,
      timeWindow,
      recording.alertId || undefined, // Pass alertId as fallback
      recording.id // Pass recordingId for precise matching (new naming convention)
    );

    if (files.videoFile) {
      console.log('✅ Video file found:');
      console.log(`   ID: ${files.videoFile.id}`);
      console.log(`   Name: ${files.videoFile.name}`);
      console.log(`   Created: ${files.videoFile.createdTime}`);
      console.log(`   Link: ${files.videoFile.webViewLink || 'N/A'}\n`);
    } else {
      console.log('❌ Video file NOT found\n');
    }

    if (files.transcriptFile) {
      console.log('✅ Transcript file found:');
      console.log(`   ID: ${files.transcriptFile.id}`);
      console.log(`   Name: ${files.transcriptFile.name}`);
      console.log(`   Created: ${files.transcriptFile.createdTime}`);
      console.log(`   Link: ${files.transcriptFile.webViewLink || 'N/A'}\n`);
    } else {
      console.log('❌ Transcript file NOT found\n');
      console.log('💡 Troubleshooting:');
      console.log('   1. Make sure the meeting was recorded');
      console.log('   2. Check that the transcript was generated (Google Meet does this automatically)');
      console.log('   3. Verify the files are in "Meet Recordings" folder in Google Drive');
      console.log('   4. Check that the Drive API account has access to the files');
      console.log('   5. The file should be named like: "Support Call - Alert [alertId] - [date] - Notes by Gemini"');
    }

    // List all recent Google Docs in Meet Recordings folder to help debug
    if (!files.transcriptFile) {
      console.log('\n📋 Searching for all Google Docs in "Meet Recordings" folder...');
      try {
        const drive = await (await import('../src/lib/google-drive/drive-service')).getDriveClient();
        
        // Find Meet Recordings folder
        const folderResponse = await drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder' and name='Meet Recordings' and trashed=false",
          fields: 'files(id, name)',
          pageSize: 1,
        });

        if (folderResponse.data.files && folderResponse.data.files.length > 0) {
          const folderId = folderResponse.data.files[0].id!;
          console.log(`   Found "Meet Recordings" folder: ${folderId}\n`);
          
          // List all Google Docs in that folder
          const docsResponse = await drive.files.list({
            q: `mimeType='application/vnd.google-apps.document' and '${folderId}' in parents and trashed=false`,
            orderBy: 'createdTime desc',
            pageSize: 10,
            fields: 'files(id, name, createdTime)',
          });

          if (docsResponse.data.files && docsResponse.data.files.length > 0) {
            console.log(`   Found ${docsResponse.data.files.length} Google Docs in folder:\n`);
            docsResponse.data.files.forEach((doc, index) => {
              console.log(`   ${index + 1}. ${doc.name}`);
              console.log(`      ID: ${doc.id}`);
              console.log(`      Created: ${doc.createdTime}\n`);
            });
          } else {
            console.log('   No Google Docs found in "Meet Recordings" folder');
          }
        } else {
          console.log('   "Meet Recordings" folder not found');
        }
      } catch (error) {
        console.error('   Error searching folder:', error);
      }
    }

  } catch (error) {
    console.error('❌ Error finding files:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
    }
  } finally {
    process.exit(0);
  }
}

findFiles();
