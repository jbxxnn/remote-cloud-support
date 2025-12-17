# Gemini API Integration

This directory contains the Google Gemini API integration for SupportSense.

## Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable

Add to your `.env.local` file:

```env
GEMINI_API_KEY=your-api-key-here
```

Optional configuration:

```env
GEMINI_MODEL=gemini-2.5-flash  # Default: gemini-2.5-flash
GEMINI_TEMPERATURE=0.7           # Default: 0.7
GEMINI_MAX_TOKENS=8192          # Default: 8192
```

### 3. Discover Available Models (Optional)

To see all available models and get a suggested model:

```bash
node scripts/discover-gemini-models.js
```

Or use the API endpoint (requires authentication):

```bash
curl http://localhost:3000/api/gemini/models
```

Or visit: `http://localhost:3000/api/gemini/models`

### 4. Test Connection

Test the API connection:

```bash
curl http://localhost:3000/api/gemini/health
```

Or visit: `http://localhost:3000/api/gemini/health`

## Usage

### Basic Text Generation

```typescript
import { geminiClient } from '@/lib/gemini/gemini-client';

const response = await geminiClient.generateText('Summarize this alert: ...');
console.log(response.text);
```

### Conversation

```typescript
const messages = [
  { role: 'user', content: 'What is the status of this alert?' },
  { role: 'model', content: 'The alert is pending.' },
  { role: 'user', content: 'What should I do next?' },
];

const response = await geminiClient.generateConversation(messages);
console.log(response.text);
```

## Files

- `config.ts` - Configuration and environment variable handling
- `gemini-client.ts` - Main Gemini API client wrapper
- `README.md` - This file

## Model Discovery

The system includes automatic model detection. If the configured model is not found, the client will:

1. Query the API for available models
2. Select the best model (preferring flash models that support `generateContent`)
3. Automatically use the detected model

You can also manually discover models using:
- The `/api/gemini/models` endpoint
- The `scripts/discover-gemini-models.js` script

## API Endpoints

- `GET /api/gemini/health` - Health check endpoint
- `GET /api/gemini/models` - List all available models and get suggested model

## Error Handling

The client throws `GeminiError` objects with:
- `message`: Error message
- `code`: Error code (if available)
- `status`: HTTP status (if available)

### Model Not Found Errors

If you encounter a "model not found" error (404), the client will automatically try to detect and use a compatible model. You can also:

1. List available models using the `/api/gemini/models` endpoint
2. Run the discovery script: `node scripts/discover-gemini-models.js`
3. Update your `.env.local` with a valid model name from the list

## Transcription (Google Speech-to-Text)

The transcription service uses Google Cloud Speech-to-Text API for converting audio to text.

### Setup

See [Google Speech-to-Text Setup Guide](../../docs/google-speech-to-text-setup.md) for detailed setup instructions.

**Quick Setup:**
1. Enable Cloud Speech-to-Text API in Google Cloud Console
2. Create a service account with "Cloud Speech-to-Text API User" role
3. Download service account JSON key
4. Add to `.env.local`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

### Supported Formats

- **Audio:** WAV, FLAC, MP3, WebM, OGG
- **Video:** Requires audio extraction first (ffmpeg recommended)

### Usage

Transcription happens automatically when recordings are processed:
```typescript
import { transcribeRecording } from '@/lib/gemini/transcription-service';

const result = await transcribeRecording(
  recordingId,
  audioBuffer,
  'audio/wav',
  { language: 'en' }
);
```

## Next Steps

See `NextPhase.md` for implementation tasks:
- ✅ Task 3.1.1: Set Up Gemini API Integration
- ✅ Task 3.1.2: Accept A/V Recordings
- ✅ Task 3.1.3: Generate Transcripts (with Google Speech-to-Text)
- Task 3.1.4: Produce Basic Tags

