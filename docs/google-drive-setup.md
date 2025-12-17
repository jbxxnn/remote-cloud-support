# Google Drive API Setup Guide

This guide explains how to set up Google Drive API integration for automatically fetching Google Meet recordings and transcripts.

## Overview

When a Google Meet meeting is recorded, Google automatically saves:
1. **Video file** (MP4) - The recording
2. **Transcript** (Google Doc) - Automatically generated transcript

Our system can automatically fetch both from Google Drive, eliminating the need for manual uploads and transcription.

## Prerequisites

- Google account (personal or Google Workspace)
- Google Cloud Project
- Access to Google Drive API

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Required APIs

Enable the following APIs in your project:

1. **Google Drive API**
   - Go to [API Library](https://console.cloud.google.com/apis/library)
   - Search for "Google Drive API"
   - Click "Enable"

2. **Google Calendar API** (optional, for creating meetings with recording)
   - Search for "Google Calendar API"
   - Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (or Internal for Workspace)
   - App name: SupportSense (or your app name)
   - User support email: your email
   - Scopes: Add the following:
     - `https://www.googleapis.com/auth/drive.readonly` (read Drive files)
     - `https://www.googleapis.com/auth/calendar` (create calendar events)
   - Save and continue
4. Create OAuth client:
   - Application type: Web application
   - Name: SupportSense Drive Integration
   - Authorized redirect URIs: **IMPORTANT - Must match exactly!**
     - For development: `http://localhost:3000/api/google-drive/callback` (no trailing slash!)
     - For production: `https://your-domain.com/api/google-drive/callback` (no trailing slash!)
     - Also add: `http://localhost:3000/api/google-meet/callback` (if using Calendar API)
   - **Common mistakes to avoid:**
     - ❌ `http://localhost:3000/api/google-drive/callback/` (trailing slash)
     - ❌ `https://localhost:3000/api/google-drive/callback` (https instead of http)
     - ❌ `http://127.0.0.1:3000/api/google-drive/callback` (127.0.0.1 instead of localhost)
   - Click "Create"
5. Copy the **Client ID** and **Client Secret**

### 4. Get Refresh Token

You need to obtain a refresh token for server-side access:

#### Option A: Using OAuth Playground (Easier)

**IMPORTANT:** Before using OAuth Playground, you must add its redirect URI to your OAuth client:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. In "Authorized redirect URIs", add:
   ```
   https://developers.google.com/oauthplayground
   ```
4. Click "SAVE"
5. Wait 2-3 minutes for changes to propagate

**Then proceed with OAuth Playground:**

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, find:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/calendar`
6. Click "Authorize APIs"
7. Sign in and grant permissions
8. Click "Exchange authorization code for tokens"
9. Copy the **Refresh token**

#### Option B: Using Node.js Script

Create a script to get the refresh token:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/api/google-drive/callback'
);

const scopes = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh token:', token.refresh_token);
    rl.close();
  });
});
```

### 5. Configure Environment Variables

Add to your `.env.local`:

```env
# Google Drive API
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# Google Calendar API (optional, for creating meetings)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALENDAR_REFRESH_TOKEN=your-refresh-token-here
```

### 6. Set Up Webhook or Polling

For automatic processing when recordings are ready, you have two options:

#### Option A: Webhooks (Production)

**Important:** Google Drive webhooks are set up programmatically using the Drive API's "watch" endpoint, not through the Google Cloud Console UI.

For production environments with a publicly accessible URL:

1. **Ensure your webhook endpoint is publicly accessible:**
   - Your production URL must be accessible: `https://your-domain.com/api/google-drive/webhook`
   - The endpoint must handle GET requests for verification (returns challenge parameter)
   - The endpoint must handle POST requests for notifications

2. **Set up webhook programmatically:**
   
   Google Drive uses the "watch" API to subscribe to file changes. You'll need to:
   
   - Use the Drive API to watch for changes to a specific folder or all files
   - The watch endpoint requires a notification URL (your webhook endpoint)
   - Google will send notifications when files change
   
   **Note:** For most use cases, **polling is simpler and more reliable** than webhooks for Google Drive. Webhooks require:
   - Maintaining watch channels (they expire after 7 days)
   - Handling channel renewal
   - Complex setup and error handling
   
   **Recommendation:** Use **polling** (Option C below) instead of webhooks for Google Drive, unless you have specific requirements for real-time notifications.

3. **Alternative: Use Google Workspace Push Notifications (if available):**
   - If you're using Google Workspace, you can set up domain-wide push notifications
   - This requires admin access and domain configuration
   - See: [Google Workspace Push Notifications](https://developers.google.com/drive/api/v3/push)

#### Option B: Tunneling Service (Development)

For development with localhost, use a tunneling service to expose your local server:

**Using ngrok (Recommended):**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Use the HTTPS URL it provides, e.g.:
# https://abc123.ngrok.io/api/google-drive/webhook
```

**Using Cloudflare Tunnel:**
```bash
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
cloudflared tunnel --url http://localhost:3000
```

**Using localtunnel:**
```bash
npm install -g localtunnel
lt --port 3000
```

Then configure the webhook URL in Google Drive to use the tunnel URL.

#### Option C: Polling (Recommended for Development and Production)

**Polling is the recommended approach** for Google Drive integration because:
- ✅ Simple to set up (no webhook configuration needed)
- ✅ Works in development (localhost)
- ✅ More reliable than webhooks (no channel expiration)
- ✅ Easier to debug and maintain
- ✅ No public URL required

For development without tunneling, use polling instead of webhooks:

**Manual Polling:**
```bash
# Trigger polling manually
curl -X POST http://localhost:3000/api/google-drive/poll \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 5, "maxResults": 50}'
```

**Automatic Polling (Node.js script):**
```javascript
// scripts/poll-drive.js
const { pollForNewRecordings, startPollingInterval } = require('../src/lib/google-drive/polling-service');

// Poll every 5 minutes
startPollingInterval({ intervalMinutes: 5 });
```

**Or use the provided script:**
```bash
# Run polling script (polls every 5 minutes by default)
node scripts/poll-google-drive.js

# Or with custom interval
node scripts/poll-google-drive.js --interval=5 --max-results=50
```

**Or use a cron job:**
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * curl -X POST http://localhost:3000/api/google-drive/poll
```

## Testing

### Test Drive Access

```bash
# Test listing files
curl http://localhost:3000/api/google-drive/test
```

### Test Meeting Creation

1. Click "Start Call" in an alert
2. Check that Google Meet opens
3. If Calendar API is configured, check your calendar for the event

### Test Recording Processing

**Option 1: Manual Processing (Recommended for testing)**
```bash
curl -X POST http://localhost:3000/api/google-meet/process-recording \
  -H "Content-Type: application/json" \
  -d '{"recordingId": "your-recording-id"}'
```

**Option 2: Polling (Development)**
```bash
# Poll for new recordings
curl -X POST http://localhost:3000/api/google-drive/poll \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 5}'
```

**Option 3: Webhook (Production)**
1. Create a Google Meet recording
2. Webhook will automatically trigger processing
3. Check logs to verify processing

## Troubleshooting

### "Invalid credentials" error
- Verify Client ID and Secret are correct
- Check that refresh token is valid
- Ensure OAuth consent screen is configured

### "Insufficient permissions" error
- Verify scopes are correct in OAuth consent screen
- Re-authorize to get new refresh token with correct scopes

### Webhook not receiving notifications
- Verify webhook URL is accessible
- Check Google Cloud Console for webhook status
- Ensure service account has proper permissions

### Files not found in Drive
- Check that recordings are saved to Drive (not just local)
- Verify the account used has access to the Drive files
- Check file naming patterns match expected format

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate refresh tokens** periodically
4. **Limit scopes** to minimum required permissions
5. **Use service accounts** for production webhooks

## Next Steps

- Set up automatic webhook processing
- Configure Google Calendar for meeting creation
- Test end-to-end flow: Meeting → Recording → Processing

