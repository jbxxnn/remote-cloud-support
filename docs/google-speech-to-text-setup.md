# Google Speech-to-Text Setup Guide

## Overview

This guide explains how to set up Google Cloud Speech-to-Text API for the transcription service.

## Prerequisites

1. Google Cloud account
2. A Google Cloud project
3. Billing enabled (Speech-to-Text has free tier: 60 minutes/month)

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Speech-to-Text API

1. Navigate to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Speech-to-Text API"
3. Click "Enable"

### 3. Create Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Enter name: `speech-to-text-service`
4. Click "Create and Continue"
5. Grant role: **Cloud Speech-to-Text API User**
6. Click "Continue" then "Done"

### 4. Create Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the key file (keep it secure!)

### 5. Configure Environment Variables

You have three options for authentication:

#### Option 1: Service Account JSON File (Recommended for Production)

1. Save the downloaded JSON file securely (e.g., `google-service-account.json`)
2. Add to `.env.local`:

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-service-account.json
```

**Note:** Use absolute path or relative path from project root.

#### Option 2: Service Account JSON as String (For Cloud Deployments)

1. Copy the entire contents of the JSON file
2. Add to `.env.local` (or your deployment environment):

```env
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...",...}'
```

**Note:** Keep the entire JSON as a single-line string.

#### Option 3: API Key (Limited Use - Not Recommended)

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Restrict the key to "Cloud Speech-to-Text API"
4. Add to `.env.local`:

```env
GOOGLE_SPEECH_API_KEY=your-api-key-here
```

**Note:** API keys have limited functionality and are not recommended for production.

## Testing the Setup

### Test Transcription

1. Make sure your `.env.local` has the credentials configured
2. Upload an audio file (WAV, MP3, FLAC, etc.)
3. The transcription should work automatically

### Test Health Check

You can test the Speech-to-Text connection by checking the logs when processing a recording.

## Supported Audio Formats

- **WAV** (LINEAR16) - Recommended
- **FLAC** - Good quality
- **MP3** - May need conversion
- **WebM/OGG Opus** - Supported
- **Video files** - Audio extraction required first

## Audio Requirements

- **Sample Rate:** 16000 Hz (default) or 44100 Hz
- **Encoding:** LINEAR16, FLAC, or Opus
- **File Size:** Up to 10MB for synchronous recognition (larger files need async)

## Pricing

- **Free Tier:** 60 minutes/month
- **Standard Pricing:** $0.006 per 15 seconds after free tier
- See [Google Cloud Pricing](https://cloud.google.com/speech-to-text/pricing) for details

## Troubleshooting

### Error: "Credentials not found"

**Solution:** Make sure one of these is set:
- `GOOGLE_APPLICATION_CREDENTIALS` (path to JSON file)
- `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON as string)
- `GOOGLE_SPEECH_API_KEY` (API key)

### Error: "Permission denied"

**Solution:** Make sure the service account has "Cloud Speech-to-Text API User" role.

### Error: "API not enabled"

**Solution:** Enable Cloud Speech-to-Text API in Google Cloud Console.

### Error: "Video files require audio extraction"

**Solution:** Video files need audio extraction before transcription. Options:
1. Extract audio using ffmpeg before uploading
2. Use audio-only files
3. Implement video-to-audio conversion (future enhancement)

## Video File Support

Currently, video files require audio extraction before transcription. To support video files directly:

1. Install ffmpeg: `npm install fluent-ffmpeg`
2. Extract audio track from video
3. Transcribe the extracted audio

This will be added as a future enhancement.

## Security Best Practices

1. **Never commit credentials to git**
   - Add `.env.local` to `.gitignore`
   - Use environment variables in production

2. **Restrict service account permissions**
   - Only grant "Cloud Speech-to-Text API User" role
   - Don't use owner/admin roles

3. **Rotate keys regularly**
   - Create new keys periodically
   - Remove old unused keys

4. **Use service accounts, not user accounts**
   - Service accounts are more secure
   - Better for automated processes

## Next Steps

Once configured, the transcription service will automatically:
1. Transcribe audio files when recordings are processed
2. Store transcripts in the database
3. Link transcripts to alerts and SOP responses
4. Make transcripts available via API

See `src/lib/gemini/transcription-service.ts` for implementation details.

