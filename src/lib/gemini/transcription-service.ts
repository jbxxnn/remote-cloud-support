/**
 * Transcription Service
 * 
 * Handles speech-to-text transcription of audio/video recordings
 * Uses Google Cloud Speech-to-Text API
 * 
 * NOTE: This service uses Node.js-only modules and should only be used in server-side code (API routes)
 */

import { query } from '@/lib/database';

export interface TranscriptionOptions {
  language?: string;
  enableSpeakerDiarization?: boolean;
  enableWordTimestamps?: boolean;
  sampleRateHertz?: number;
  encoding?: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'SPEEX_WITH_HEADER_BYTE' | 'WEBM_OPUS';
}

export interface TranscriptionResult {
  transcriptId: string;
  transcriptText: string;
  language: string;
  confidence: number;
  processingTime: number;
}

/**
 * Get Speech-to-Text client
 * Uses environment variable GOOGLE_APPLICATION_CREDENTIALS or service account key
 * Lazy-loaded to avoid importing @google-cloud/speech in client-side code
 */
async function getSpeechClient(): Promise<any> {
  // Dynamic import to avoid bundling in client-side code
  const { SpeechClient } = await import('@google-cloud/speech');
  
  // Check if credentials are provided via environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new SpeechClient();
  }

  // Check if service account key is provided as JSON string
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    return new SpeechClient({ credentials });
  }

  // Check if API key is provided (for limited use cases)
  if (process.env.GOOGLE_SPEECH_API_KEY) {
    return new SpeechClient({ apiKey: process.env.GOOGLE_SPEECH_API_KEY });
  }

  throw new Error(
    'Google Speech-to-Text credentials not found. Please set one of:\n' +
    '- GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)\n' +
    '- GOOGLE_SERVICE_ACCOUNT_KEY (service account JSON as string)\n' +
    '- GOOGLE_SPEECH_API_KEY (API key for limited use)'
  );
}

/**
 * Map MIME type to Speech-to-Text encoding
 */
function getEncodingFromMimeType(mimeType: string): string {
  const mimeToEncoding: Record<string, string> = {
    'audio/wav': 'LINEAR16',
    'audio/x-wav': 'LINEAR16',
    'audio/flac': 'FLAC',
    'audio/mpeg': 'LINEAR16', // MP3 - may need conversion
    'audio/mp3': 'LINEAR16',
    'audio/webm': 'WEBM_OPUS',
    'audio/ogg': 'OGG_OPUS',
    'video/webm': 'WEBM_OPUS',
    'video/mp4': 'LINEAR16', // MP4 video - audio track needs extraction
  };

  return mimeToEncoding[mimeType.toLowerCase()] || 'LINEAR16';
}

/**
 * Detect if file is video (needs audio extraction)
 */
function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Transcribe audio/video file using Google Speech-to-Text API
 * 
 * Note: For video files, audio extraction is required before transcription.
 * This implementation handles audio files directly. For video files, you may need
 * to extract audio first using ffmpeg or similar tools.
 */
export async function transcribeRecording(
  recordingId: string,
  audioBuffer: Buffer,
  mimeType: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    // Check if this is a video file (needs audio extraction)
    if (isVideoFile(mimeType)) {
      // TODO: For video files, extract audio track first
      // This requires ffmpeg or similar tool
      // For now, throw an error to indicate video files need preprocessing
      throw new Error(
        'Video files require audio extraction before transcription. ' +
        'Please extract audio from video first, or use an audio-only file.'
      );
    }

    const language = options.language || 'en';
    const encoding = options.encoding || getEncodingFromMimeType(mimeType);
    const sampleRateHertz = options.sampleRateHertz || 16000;

    // Initialize Speech-to-Text client (lazy-loaded)
    const client = await getSpeechClient();

    // Configure recognition request
    const config = {
      encoding: encoding as any,
      sampleRateHertz: sampleRateHertz,
      languageCode: language,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: options.enableWordTimestamps || false,
      enableSpeakerDiarization: options.enableSpeakerDiarization || false,
      model: 'latest_long', // Use latest long-form model for better accuracy
    };

    const request = {
      config,
      audio: {
        content: audioBuffer.toString('base64'),
      },
    };

    // Perform transcription
    console.log(`[Transcription] Starting transcription for recording ${recordingId}...`);
    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      throw new Error('No transcription results returned from Google Speech-to-Text');
    }

    // Combine all transcript segments
    const transcriptText = response.results
      .map((result: any) => result.alternatives[0].transcript)
      .join(' ')
      .trim();

    // Calculate average confidence
    const confidences = response.results
      .map((result: any) => result.alternatives[0].confidence || 0)
      .filter((conf: number) => conf > 0);

    const confidence = confidences.length > 0
      ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
      : 0.0;

    console.log(`[Transcription] Transcription completed. Length: ${transcriptText.length} chars, Confidence: ${confidence.toFixed(2)}`);

    // Store transcript in database
    const result = await query(`
      INSERT INTO "Transcript" (
        id, "recordingId", "transcriptText", "language", "confidence", "processingTime", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `, [
      recordingId,
      transcriptText,
      language,
      confidence,
      Math.floor((Date.now() - startTime) / 1000),
    ]);

    const transcript = result.rows[0];

    // Link transcript to alert and SOP response if recording has them
    const recordingResult = await query(
      'SELECT "alertId", "sopResponseId" FROM "Recording" WHERE id = $1',
      [recordingId]
    );

    if (recordingResult.rows.length > 0) {
      const recording = recordingResult.rows[0];
      if (recording.alertId || recording.sopResponseId) {
        await query(`
          UPDATE "Transcript"
          SET "alertId" = $1, "sopResponseId" = $2
          WHERE id = $3
        `, [
          recording.alertId || null,
          recording.sopResponseId || null,
          transcript.id,
        ]);
      }
    }

    return {
      transcriptId: transcript.id,
      transcriptText,
      language,
      confidence,
      processingTime: Math.floor((Date.now() - startTime) / 1000),
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error(`Failed to transcribe recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get transcript for a recording
 */
export async function getTranscript(recordingId: string): Promise<any | null> {
  try {
    const result = await query(
      'SELECT * FROM "Transcript" WHERE "recordingId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [recordingId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Failed to get transcript:', error);
    return null;
  }
}

/**
 * Get transcript by ID
 */
export async function getTranscriptById(transcriptId: string): Promise<any | null> {
  try {
    const result = await query(
      'SELECT * FROM "Transcript" WHERE id = $1',
      [transcriptId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Failed to get transcript by ID:', error);
    return null;
  }
}

/**
 * Update transcript text
 */
export async function updateTranscript(
  transcriptId: string,
  transcriptText: string,
  confidence?: number
): Promise<void> {
  try {
    await query(`
      UPDATE "Transcript"
      SET "transcriptText" = $1, "confidence" = COALESCE($2, "confidence"), "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [transcriptText, confidence, transcriptId]);
  } catch (error) {
    console.error('Failed to update transcript:', error);
    throw error;
  }
}

