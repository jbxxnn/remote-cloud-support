/**
 * Recording Processor
 * 
 * Handles processing of audio/video recordings for Gemini analysis
 */

import { geminiClient } from './gemini-client';
import { transcribeRecording } from './transcription-service';

export interface RecordingFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

export interface ProcessingResult {
  success: boolean;
  transcriptId?: string;
  error?: string;
  processingTime?: number;
}

/**
 * Validate recording file format
 */
export function validateRecordingFormat(file: RecordingFile): { valid: boolean; error?: string } {
  const allowedVideoTypes = [
    'video/mp4',
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'video/webm',
  ];

  const allowedAudioTypes = [
    'audio/mpeg', // MP3
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
  ];

  const allowedTypes = [...allowedVideoTypes, ...allowedAudioTypes];

  if (!allowedTypes.includes(file.mimeType)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.mimeType}. Supported types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size (max 100MB for MVP)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit: ${(file.fileSize / 1024 / 1024).toFixed(2)}MB. Maximum: 100MB`,
    };
  }

  return { valid: true };
}

/**
 * Process recording file for Gemini
 * 
 * Note: Gemini API currently supports text generation, not direct audio/video processing.
 * For MVP, we'll need to:
 * 1. Extract audio from video (if video)
 * 2. Use a speech-to-text service (or wait for Gemini audio support)
 * 3. Then use Gemini to analyze the transcript
 * 
 * For now, this is a placeholder that will be enhanced when Gemini audio support is available
 * or when we integrate a speech-to-text service.
 */
export async function processRecording(
  recordingId: string,
  file: RecordingFile
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    // Validate file format
    const validation = validateRecordingFormat(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Step 1: Transcribe the recording
    // Note: For MVP, transcription service uses placeholder
    // In production, this will use Google Speech-to-Text or similar
    const transcriptionResult = await transcribeRecording(
      recordingId,
      file.buffer,
      file.mimeType,
      {
        language: 'en', // Default to English, can be detected automatically
        enableWordTimestamps: false, // Can be enabled for advanced features
      }
    );

    // Step 2: Trigger Gemini processing on transcript (for Task 3.1.4)
    // This will analyze the transcript and extract tags
    await triggerGeminiProcessing(recordingId, transcriptionResult.transcriptText);

    return {
      success: true,
      transcriptId: transcriptionResult.transcriptId,
      processingTime: Math.floor((Date.now() - startTime) / 1000),
    };
  } catch (error) {
    console.error('Recording processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during processing',
      processingTime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}

/**
 * Trigger Gemini processing for a recording
 * This will be called after transcript is generated
 * Analyzes transcript and extracts tags (tone, motion, risk words, keywords)
 */
export async function triggerGeminiProcessing(recordingId: string, transcriptText: string): Promise<void> {
  try {
    console.log(`[Recording Processor] Triggering Gemini tag extraction for recording ${recordingId}`);
    console.log(`[Recording Processor] Transcript length: ${transcriptText.length} characters`);

    // Get transcript ID from database
    const { query } = await import('@/lib/database');
    const transcriptResult = await query(
      'SELECT id FROM "Transcript" WHERE "recordingId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [recordingId]
    );

    if (transcriptResult.rows.length === 0) {
      throw new Error(`No transcript found for recording ${recordingId}`);
    }

    const transcriptId = transcriptResult.rows[0].id;

    // Generate tags using Gemini
    const { generateTagsFromTranscript } = await import('./tag-generator');
    const result = await generateTagsFromTranscript(transcriptId, recordingId, transcriptText);

    console.log(`[Recording Processor] Generated ${result.tags.length} tags in ${result.processingTime}s`);
  } catch (error) {
    console.error('Failed to trigger Gemini processing:', error);
    // Don't throw - tag generation failure shouldn't break the recording processing
    // Log error but allow recording to be marked as completed
  }
}

