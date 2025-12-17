# Google Meet Integration Plan

## Overview
Integrate Google Meet recordings with the Gemini processing pipeline to automatically analyze conversations during alert resolution.

## Integration Flow

```
Staff clicks "Start Call" in Alert Modal
    ↓
Create Google Calendar event with Meet link (or generate Meet link)
    ↓
Google Meet opens in new tab
    ↓
Staff starts recording in Google Meet
    ↓
Meeting ends → Google Meet saves to Drive:
    - Video file (MP4)
    - Transcript (Google Doc) ← AUTOMATIC!
    ↓
Google Drive webhook notifies system (or polling detects new files)
    ↓
System fetches from Google Drive:
    1. Download video recording
    2. Export transcript from Google Doc → text
    ↓
Create Recording record with:
    - Video file URL/path
    - Transcript text (from Google Doc)
    - transcriptSource: 'google_meet'
    ↓
Skip transcription step (already have transcript!)
    ↓
Direct to Gemini tag extraction:
    - Analyze transcript for tags
    - Extract tone, risk words, keywords
    ↓
Annotations created and linked to alert/SOP
    ↓
Assistant can summarize/resolve alert with AI insights
```

## Implementation Approach

### Option 1: Google Meet API (Recommended)
**Pros:**
- Full control over meeting creation
- Automatic recording setup
- Webhook notifications
- Access to meeting metadata

**Cons:**
- Requires Google Workspace account
- More complex setup
- API quota limits

**Implementation:**
- Use Google Calendar API to create meetings with recording enabled
- Use Google Drive API to access recordings
- Use Google Meet API webhooks for recording status

### Option 2: Google Meet Links (Simpler)
**Pros:**
- Simple implementation
- No API setup required
- Works with any Google account

**Cons:**
- Manual recording setup required
- No automatic webhook notifications
- Manual upload required

**Implementation:**
- Generate Google Meet link
- Staff manually starts recording
- Staff manually uploads recording after meeting

### Option 3: Hybrid Approach (Recommended for MVP)
**Pros:**
- Quick to implement
- Works immediately
- Can upgrade to full API later

**Implementation:**
1. **Phase 1 (MVP)**: Generate Google Meet link, staff uploads recording manually
2. **Phase 2**: Add Google Drive integration to auto-fetch recordings
3. **Phase 3**: Full Google Meet API integration with webhooks

## Technical Details

### 1. Google Meet Button Implementation

**Location:** `src/app/staff/client/[id]/page.tsx`

**Current State:**
```typescript
const handleStartCall = () => {
  console.log('Starting call...');
  // TODO: Implement Google Meet
};
```

**Implementation:**
```typescript
const handleStartCall = async () => {
  // Generate Google Meet link
  const meetLink = await generateGoogleMeetLink({
    alertId: selectedAlert?.id,
    clientId: clientId,
    staffId: currentUser.id
  });
  
  // Open Google Meet in new tab
  window.open(meetLink, '_blank');
  
  // Create pending recording record
  await createPendingRecording({
    alertId: selectedAlert?.id,
    clientId: clientId,
    recordingType: 'video',
    source: 'google_meet',
    status: 'pending'
  });
};
```

### 2. Recording Storage

**Database Schema Enhancement:**
```sql
-- Add to Recording table
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
-- Values: 'manual', 'google_meet', 'phone', 'screen'
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "meetingId" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "processingStatus" TEXT DEFAULT 'pending';
-- Values: 'pending', 'processing', 'completed', 'failed'
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "videoDriveFileId" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "transcriptDriveFileId" TEXT;
ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT;

-- Add to Transcript table
ALTER TABLE "Transcript" ADD COLUMN IF NOT EXISTS "transcriptSource" TEXT DEFAULT 'speech_to_text';
-- Values: 'google_meet', 'manual', 'speech_to_text'
ALTER TABLE "Transcript" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
```

### 3. Google Meet Service

**File:** `src/lib/google-meet/meet-service.ts`

**Functions:**
- `generateMeetLink()` - Generate Google Meet link
- `createMeetingWithRecording()` - Create meeting with recording enabled (Google Calendar API)
- `getRecordingFromDrive()` - Fetch video recording from Google Drive
- `getTranscriptFromDrive()` - Fetch and export transcript from Google Doc
- `handleRecordingWebhook()` - Process webhook notifications

### 3.1. Google Drive Service

**File:** `src/lib/google-drive/drive-service.ts` (new)

**Functions:**
- `initializeDriveClient()` - Set up Google Drive API client
- `listMeetRecordings()` - List Google Meet recordings in Drive
- `downloadFile()` - Download file from Google Drive
- `exportGoogleDoc()` - Export Google Doc to plain text
- `findRecordingFiles()` - Find video and transcript files for a meeting

### 4. Auto-Processing Pipeline

**File:** `src/app/api/recordings/route.ts` and `src/lib/gemini/recording-processor.ts`

**Enhancement:**
```typescript
// Processing logic for Google Meet recordings
if (recording.source === 'google_meet') {
  // Fetch from Google Drive
  const videoFile = await downloadFromDrive(videoDriveFileId);
  const transcriptDoc = await getGoogleDoc(transcriptDriveFileId);
  const transcriptText = await exportGoogleDocToText(transcriptDoc);
  
  // Store transcript directly (no transcription needed!)
  await createTranscript(recordingId, transcriptText, {
    source: 'google_meet',
    driveFileId: transcriptDriveFileId
  });
  
  // Skip to Gemini analysis (no transcription step)
  await generateTagsFromTranscript(transcriptId, transcriptText);
  
} else if (recording.source === 'manual') {
  // Manual uploads still need transcription
  const transcript = await transcribeRecording(file);
  await generateTagsFromTranscript(transcriptId, transcript.text);
}
```

### 5. Webhook Handler

**File:** `src/app/api/google-meet/webhook/route.ts` or `src/app/api/google-drive/webhook/route.ts`

**Purpose:**
- Receive notifications when Google Drive files are created/updated
- Filter for Google Meet recordings (video + transcript)
- Match files to pending Recording records
- Download video and transcript from Google Drive
- Update Recording record with file URLs
- Trigger Gemini processing (skipping transcription step)

## Environment Variables

```env
# Google Calendar API (for creating meetings with recording)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google-meet/callback

# Google Drive API (for fetching recordings and transcripts)
GOOGLE_DRIVE_API_KEY=your-api-key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR use OAuth2:
GOOGLE_DRIVE_CLIENT_ID=your-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-drive-client-secret

# Google Meet API (optional, for advanced features)
GOOGLE_MEET_API_KEY=your-meet-api-key

# Gemini API (already needed)
GEMINI_API_KEY=your-gemini-key 

# Google Speech-to-Text (only needed for manual uploads)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## MVP Implementation Steps

### Phase 1: Basic Integration (Week 1)
1. ✅ Update NextPhase.md with Google Meet integration
2. ✅ Create integration plan
3. Implement Google Meet link generation
4. Update "Start Call" button to open Google Meet
5. Create pending recording record when meeting starts
6. Manual upload flow for recordings

### Phase 2: Auto-Processing (Week 2)
1. ✅ Set up Gemini API integration
2. ✅ Implement recording processor
3. Auto-trigger Gemini on recording upload
4. **For Google Meet**: Use transcripts directly (no transcription needed)
5. **For Manual Uploads**: Generate transcripts via Speech-to-Text
6. Extract basic tags with Gemini

### Phase 3: Google Drive Integration (Week 3) - **CURRENT FOCUS**
1. Set up Google Drive API credentials and authentication
2. Create Google Drive service to:
   - List and search for Google Meet recordings
   - Download video files from Drive
   - Export Google Doc transcripts to text
   - Match Drive files to Recording records
3. Implement webhook handler for Drive file changes
4. Update processing pipeline to:
   - Skip transcription for Google Meet recordings
   - Use Google Meet transcripts directly
   - Only use Speech-to-Text for manual uploads
5. Add database fields for Drive file IDs and transcript source

### Phase 4: Full API Integration (Future)
1. Google Meet API setup
2. Automatic meeting creation with recording
3. Real-time webhook notifications
4. Advanced metadata tracking

## User Experience Flow

### Staff Workflow:
1. Staff views alert in Alert Modal
2. Staff clicks "Start Call" button
3. Google Meet opens in new tab
4. Staff conducts meeting with client
5. Staff ends meeting (recording saved to Google Drive)
6. Staff returns to system
7. System automatically processes recording (or staff uploads manually)
8. Assistant shows AI-generated summary of conversation
9. Staff can use insights to resolve alert

### System Workflow:

**For Google Meet Recordings:**
1. Recording created → Status: "pending"
2. Google Drive webhook/polling detects new files → Status: "processing"
3. System fetches video and transcript from Drive
4. Transcript stored directly (source: 'google_meet') → Skip transcription
5. Gemini analyzes transcript → Extracts tags
6. Annotations created → Status: "completed"
7. Assistant can query → Provides insights

**For Manual Uploads:**
1. Recording uploaded → Status: "processing"
2. Transcription via Speech-to-Text → Transcript created (source: 'speech_to_text')
3. Gemini analyzes transcript → Extracts tags
4. Annotations created → Status: "completed"
5. Assistant can query → Provides insights

## Error Handling

### Scenarios:
1. **Meeting not recorded**: Show notification, allow manual upload
2. **Recording processing fails**: Retry mechanism, manual trigger option
3. **Google Drive access denied**: Fallback to manual upload
4. **Gemini API errors**: Log error, queue for retry, notify staff

## Security Considerations

1. **API Keys**: Store in environment variables, never in code
2. **Recording Access**: Only staff who created recording can access
3. **Client Data**: Ensure recordings are linked to correct client
4. **Webhook Security**: Verify webhook signatures from Google
5. **File Storage**: Secure storage for temporary files

## Testing Plan

### Unit Tests:
- Google Meet link generation
- Recording record creation
- Webhook payload parsing
- Error handling

### Integration Tests:
- End-to-end flow: Button click → Recording → Processing
- Google Drive API integration
- Gemini processing pipeline
- Assistant query with recording context

### Manual Testing:
- Test Google Meet link generation
- Test recording upload
- Test Gemini processing
- Test assistant queries with recordings

## Success Metrics

1. **Recording Creation**: 100% of Google Meet calls create recording records
2. **Processing Success**: 95%+ of recordings successfully processed
3. **Processing Time**: 
   - Google Meet: < 2 minutes from Drive detection to transcript ready (no transcription needed)
   - Manual Upload: < 5 minutes from upload to transcript ready
4. **Cost Savings**: 100% reduction in Speech-to-Text API costs for Google Meet recordings
5. **Tag Accuracy**: Manual review of tag quality
6. **User Adoption**: % of staff using Google Meet for alerts

## Key Benefits of This Approach

1. **No Transcription Needed**: Google Meet automatically provides transcripts, saving time and API costs
2. **Faster Processing**: Skip transcription step for Google Meet recordings (2-3 minutes faster)
3. **Better Accuracy**: Google Meet transcripts are often more accurate than Speech-to-Text
4. **Automatic**: No manual upload required - system automatically fetches from Drive
5. **Cost Effective**: Only use Speech-to-Text API for manual uploads

## Next Steps

1. ✅ Update NextPhase.md
2. ✅ Create integration plan
3. Start implementation:
   - Task 3.1.1: Gemini API setup
   - Task 3.1.2: Recording processing (with Google Meet support)
   - Google Meet button implementation

