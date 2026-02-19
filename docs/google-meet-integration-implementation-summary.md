# Google Meet Integration - Implementation Summary

## Overview

Complete Google Drive integration for automatically fetching Google Meet recordings and transcripts. The system now skips transcription for Google Meet recordings since Google automatically provides transcripts.

## What Was Implemented

### 1. Database Schema Updates

**Migration:** `database/migration-018-add-google-drive-fields.sql`

Added fields to support Google Drive integration:
- `Recording.videoDriveFileId` - Google Drive file ID for video
- `Recording.transcriptDriveFileId` - Google Drive file ID for transcript
- `Recording.calendarEventId` - Google Calendar event ID
- `Transcript.transcriptSource` - Source of transcript ('google_meet', 'manual', 'speech_to_text')
- `Transcript.driveFileId` - Google Drive file ID if from Drive

### 2. Google Drive Service

**File:** `src/lib/google-drive/drive-service.ts`

Functions:
- `initializeDriveClient()` - Set up OAuth2 client
- `getDriveClient()` - Get Drive API instance
- `listMeetRecordings()` - List Google Meet recordings in Drive
- `findRecordingFiles()` - Find video and transcript files for a meeting
- `downloadFile()` - Download file from Drive
- `exportGoogleDoc()` - Export Google Doc transcript to text
- `getFileMetadata()` - Get file metadata

### 3. Google Meet Service Updates

**File:** `src/lib/google-meet/meet-service.ts`

Enhanced to:
- Use Google Calendar API to create meetings with recording enabled
- Generate proper meeting links with Calendar integration
- Store Calendar event IDs for tracking

### 4. Google Meet Recording Processor

**File:** `src/lib/google-meet/recording-processor.ts`

New service that:
- Fetches video and transcript from Google Drive
- Exports transcript from Google Doc to text
- Stores transcript directly (skips transcription step)
- Triggers Gemini tag extraction
- Updates recording status

### 5. API Endpoints

#### `/api/google-meet/create-recording` (Updated)
- Now uses async `generateGoogleMeetLink()` 
- Stores `calendarEventId` if Calendar API is used
- Creates pending recording record

#### `/api/google-drive/webhook` (New)
- Receives Google Drive file change notifications
- Matches files to pending recordings
- Automatically triggers processing

#### `/api/google-meet/process-recording` (New)
- Manual trigger for processing Google Meet recordings
- Useful if webhook doesn't fire
- Allows staff to manually process recordings

### 6. Processing Pipeline Updates

**Key Change:** Google Meet recordings skip transcription!

**Flow for Google Meet:**
1. Recording created → Status: "pending"
2. Webhook detects files in Drive → Status: "processing"
3. Fetch transcript from Google Doc → Store directly
4. Gemini tag extraction → Status: "completed"

**Flow for Manual Uploads:**
1. Upload file → Status: "processing"
2. Transcription via Speech-to-Text → Create transcript
3. Gemini tag extraction → Status: "completed"

## Environment Variables Required

```env
# Google Drive API (Required)
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# Google Calendar API (Optional, for meeting creation)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your-refresh-token
```

## Dependencies Added

- `googleapis` - Google APIs client library

## Setup Steps

1. **Run database migration:**
   ```bash
   npm run db:migrate
   ```

2. **Set up Google Drive API:**
   - Follow `docs/google-drive-setup.md`
   - Get OAuth credentials
   - Obtain refresh token
   - Add to `.env.local`

3. **Test the integration:**
   - Create a Google Meet recording
   - Verify webhook receives notification
   - Check that transcript is fetched and processed

## Benefits

1. **No Transcription Needed** - Google Meet provides transcripts automatically
2. **Faster Processing** - Skip 2-3 minutes of transcription time
3. **Cost Savings** - No Speech-to-Text API costs for Google Meet recordings
4. **Better Accuracy** - Google Meet transcripts are often more accurate
5. **Fully Automatic** - No manual upload required

## Next Steps

1. Set up Google Drive API credentials (see `docs/google-drive-setup.md`)
2. Test meeting creation with Calendar API
3. Configure webhook for automatic processing
4. Test end-to-end flow
5. Monitor processing success rates

## Files Created/Modified

### Created:
- `database/migration-018-add-google-drive-fields.sql`
- `src/lib/google-drive/drive-service.ts`
- `src/lib/google-meet/recording-processor.ts`
- `src/app/api/google-drive/webhook/route.ts`
- `src/app/api/google-meet/process-recording/route.ts`
- `docs/google-drive-setup.md`
- `docs/google-meet-integration-implementation-summary.md`

### Modified:
- `docs/google-meet-integration-plan.md` - Updated with new flow
- `src/lib/google-meet/meet-service.ts` - Added Calendar API support
- `src/app/api/google-meet/create-recording/route.ts` - Made async, added calendarEventId

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Google Drive API credentials configured
- [ ] Can list files in Drive
- [ ] Can export Google Doc to text
- [ ] Meeting creation works (with/without Calendar API)
- [ ] Webhook receives notifications
- [ ] Recording processing works automatically
- [ ] Manual processing endpoint works
- [ ] Transcripts are stored with correct source
- [ ] Gemini tag extraction works with Google Meet transcripts


