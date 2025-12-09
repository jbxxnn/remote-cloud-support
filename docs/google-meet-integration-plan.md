# Google Meet Integration Plan

## Overview
Integrate Google Meet recordings with the Gemini processing pipeline to automatically analyze conversations during alert resolution.

## Integration Flow

```
Staff clicks "Start Call" in Alert Modal
    ↓
Google Meet opens (via Google Meet API or direct link)
    ↓
Meeting is recorded (Google Meet Cloud Recording)
    ↓
Google Meet webhook notifies system when recording is ready
    ↓
System downloads recording from Google Drive
    ↓
Create Recording record (linked to alertId, sopResponseId)
    ↓
Auto-trigger Gemini Processing Pipeline
    ↓
Gemini generates transcript
    ↓
Gemini extracts tags (tone, risk words, keywords)
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
```

### 3. Google Meet Service

**File:** `src/lib/google-meet/meet-service.ts`

**Functions:**
- `generateMeetLink()` - Generate Google Meet link
- `createMeetingWithRecording()` - Create meeting with recording enabled (API)
- `getRecordingFromDrive()` - Fetch recording from Google Drive
- `handleRecordingWebhook()` - Process webhook notifications

### 4. Auto-Processing Pipeline

**File:** `src/app/api/recordings/route.ts`

**Enhancement:**
```typescript
// After creating recording record
if (recording.source === 'google_meet' && recording.fileUrl) {
  // Auto-trigger Gemini processing
  await triggerGeminiProcessing(recording.id);
}
```

### 5. Webhook Handler

**File:** `src/app/api/google-meet/webhook/route.ts`

**Purpose:**
- Receive notifications when Google Meet recording is ready
- Download recording from Google Drive
- Update Recording record
- Trigger Gemini processing

## Environment Variables

```env
# Google Meet API (if using full API)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google-meet/callback

# Google Drive API (for fetching recordings)
GOOGLE_DRIVE_API_KEY=your-api-key

# Gemini API (already needed)
GEMINI_API_KEY=your-gemini-key
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
1. Set up Gemini API integration
2. Implement recording processor
3. Auto-trigger Gemini on recording upload
4. Generate transcripts
5. Extract basic tags

### Phase 3: Google Drive Integration (Week 3)
1. Set up Google Drive API
2. Auto-fetch recordings from Google Drive
3. Webhook handler for recording notifications
4. Automatic processing pipeline

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
1. Recording created → Status: "pending"
2. Recording uploaded/fetched → Status: "processing"
3. Gemini processes → Generates transcript
4. Gemini analyzes → Extracts tags
5. Annotations created → Status: "completed"
6. Assistant can query → Provides insights

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
3. **Processing Time**: < 5 minutes from upload to transcript ready
4. **Tag Accuracy**: Manual review of tag quality
5. **User Adoption**: % of staff using Google Meet for alerts

## Next Steps

1. ✅ Update NextPhase.md
2. ✅ Create integration plan
3. Start implementation:
   - Task 3.1.1: Gemini API setup
   - Task 3.1.2: Recording processing (with Google Meet support)
   - Google Meet button implementation

