/**
 * Google Meet Recording Processor
 * 
 * Handles processing of Google Meet recordings fetched from Google Drive
 */

import { query } from '@/lib/database';
import { 
  findRecordingFiles, 
  downloadFile, 
  exportGoogleDoc,
  getFileMetadata 
} from '@/lib/google-drive/drive-service';
import { generateTagsFromTranscript } from '@/lib/gemini/tag-generator';

export interface ProcessMeetRecordingOptions {
  recordingId: string;
  videoDriveFileId?: string;
  transcriptDriveFileId?: string;
  meetingId?: string;
  meetingStartTime?: Date;
}

export interface ProcessMeetRecordingResult {
  success: boolean;
  transcriptId?: string;
  error?: string;
  processingTime: number;
}

/**
 * Process Google Meet recording from Google Drive
 * 
 * This function:
 * 1. Finds or downloads video and transcript files from Drive
 * 2. Stores transcript directly (no transcription needed)
 * 3. Triggers Gemini tag extraction
 */
export async function processMeetRecording(
  options: ProcessMeetRecordingOptions
): Promise<ProcessMeetRecordingResult> {
  const startTime = Date.now();

  try {
    const { recordingId, videoDriveFileId, transcriptDriveFileId, meetingId, meetingStartTime } = options;

    // Get recording record
    const recordingResult = await query(
      'SELECT * FROM "Recording" WHERE id = $1',
      [recordingId]
    );

    if (recordingResult.rows.length === 0) {
      return {
        success: false,
        error: 'Recording not found',
        processingTime: Math.floor((Date.now() - startTime) / 1000),
      };
    }

    const recording = recordingResult.rows[0];

    // Update status to processing
    await query(
      'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
      ['processing', recordingId]
    );

    let videoFileId = videoDriveFileId || recording.videoDriveFileId;
    let transcriptFileId = transcriptDriveFileId || recording.transcriptDriveFileId;

    // If file IDs not provided, try to find them
    if (!videoFileId || !transcriptFileId) {
      const files = await findRecordingFiles(
        meetingId || recording.meetingId || '',
        meetingStartTime || recording.createdAt ? new Date(recording.createdAt) : undefined,
        30, // 30 minute window
        recording.alertId || undefined, // Pass alertId as fallback
        recordingId // Pass recordingId for precise matching (new naming convention)
      );

      if (files.videoFile) {
        videoFileId = files.videoFile.id;
      }
      if (files.transcriptFile) {
        transcriptFileId = files.transcriptFile.id;
      }
    }

    if (!transcriptFileId) {
      return {
        success: false,
        error: 'Transcript file not found in Google Drive',
        processingTime: Math.floor((Date.now() - startTime) / 1000),
      };
    }

    // Download and export transcript from Google Doc
    console.log(`[Meet Recording Processor] Exporting transcript from Drive file: ${transcriptFileId}`);
    const fullTranscriptText = await exportGoogleDoc(transcriptFileId);
    
    // Parse and extract only Summary and Suggested next steps
    const { parseGoogleMeetTranscript } = await import('../google-drive/drive-service');
    const transcriptText = parseGoogleMeetTranscript(fullTranscriptText);
    
    console.log(`[Meet Recording Processor] Parsed transcript: ${transcriptText.length} chars (from ${fullTranscriptText.length} chars original)`);

    if (!transcriptText || transcriptText.trim().length === 0) {
      return {
        success: false,
        error: 'Transcript is empty',
        processingTime: Math.floor((Date.now() - startTime) / 1000),
      };
    }

    // Get transcript file metadata
    const transcriptMetadata = await getFileMetadata(transcriptFileId);

    // Download video file if needed (for storage, not processing)
    let videoBuffer: Buffer | null = null;
    if (videoFileId) {
      try {
        console.log(`[Meet Recording Processor] Downloading video from Drive file: ${videoFileId}`);
        videoBuffer = await downloadFile(videoFileId);
        
        // Update recording with video file info
        const videoMetadata = await getFileMetadata(videoFileId);
        // Store video file path/URL (you might want to save it to your storage)
        // For now, we'll just store the Drive file ID
      } catch (error) {
        console.warn('Failed to download video file:', error);
        // Continue without video - transcript is the priority
      }
    }

    // Create transcript record (source: google_meet)
    const transcriptResult = await query(
      `INSERT INTO "Transcript" (
        "recordingId", "transcriptText", "transcriptSource", "driveFileId", "createdAt"
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id`,
      [recordingId, transcriptText, 'google_meet', transcriptFileId]
    );

    const transcriptId = transcriptResult.rows[0].id;

    // Update recording with Drive file IDs
    await query(
      `UPDATE "Recording" 
       SET "videoDriveFileId" = COALESCE($1, "videoDriveFileId"),
           "transcriptDriveFileId" = COALESCE($2, "transcriptDriveFileId")
       WHERE id = $3`,
      [videoFileId, transcriptFileId, recordingId]
    );

    // Trigger Gemini tag extraction (skip transcription step)
    console.log(`[Meet Recording Processor] Triggering Gemini tag extraction for transcript ${transcriptId}`);
    try {
      await generateTagsFromTranscript(transcriptId, recordingId, transcriptText);
      console.log(`[Meet Recording Processor] Successfully generated tags for recording ${recordingId}`);
    } catch (error) {
      console.error('Failed to generate tags:', error);
      // Don't fail the whole process if tag generation fails
    }

    // Update status to completed
    await query(
      'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
      ['completed', recordingId]
    );

    return {
      success: true,
      transcriptId,
      processingTime: Math.floor((Date.now() - startTime) / 1000),
    };
  } catch (error) {
    console.error('Error processing Meet recording:', error);

    // Update status to failed
    await query(
      'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
      ['failed', options.recordingId]
    ).catch(err => console.error('Failed to update status:', err));

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}

