import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";
import { processMeetRecording } from "@/lib/google-meet/recording-processor";

/**
 * POST /api/google-drive/webhook - Google Drive webhook handler
 * 
 * Receives notifications when files are created/updated in Google Drive
 * Filters for Google Meet recordings and triggers processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Google Drive webhook format
    // See: https://developers.google.com/drive/api/v3/push
    const { message } = body;

    if (!message || !message.data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Decode the resource state (file ID)
    const fileId = Buffer.from(message.data, 'base64').toString('utf-8');

    console.log(`[Google Drive Webhook] File changed: ${fileId}`);

    // Find pending recordings that might match this file
    // We'll check if this file is a video or transcript for any pending recording
    const pendingRecordings = await query(`
      SELECT id, "meetingId", "createdAt", "videoDriveFileId", "transcriptDriveFileId"
      FROM "Recording"
      WHERE "source" = 'google_meet' 
        AND "processingStatus" = 'pending'
        AND (
          "videoDriveFileId" = $1 
          OR "transcriptDriveFileId" = $1
          OR ("videoDriveFileId" IS NULL AND "transcriptDriveFileId" IS NULL)
        )
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, [fileId]);

    if (pendingRecordings.rows.length === 0) {
      // File doesn't match any pending recording, ignore
      return NextResponse.json({ status: 'ok', message: 'No matching recording found' });
    }

    // Process the first matching recording
    const recording = pendingRecordings.rows[0];
    
    console.log(`[Google Drive Webhook] Processing recording ${recording.id} for file ${fileId}`);

    // Determine which file type this is
    let videoFileId: string | undefined;
    let transcriptFileId: string | undefined;

    if (recording.videoDriveFileId === fileId) {
      videoFileId = fileId;
      transcriptFileId = recording.transcriptDriveFileId || undefined;
    } else if (recording.transcriptDriveFileId === fileId) {
      transcriptFileId = fileId;
      videoFileId = recording.videoDriveFileId || undefined;
    } else {
      // File ID not yet set, we'll let the processor find it
      transcriptFileId = fileId; // Assume it's a transcript if we don't know
    }

    // Process the recording
    const result = await processMeetRecording({
      recordingId: recording.id,
      videoDriveFileId: videoFileId,
      transcriptDriveFileId: transcriptFileId,
      meetingId: recording.meetingId,
      meetingStartTime: recording.createdAt ? new Date(recording.createdAt) : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        status: 'ok',
        message: `Recording ${recording.id} processed successfully`,
        recordingId: recording.id,
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: result.error,
        recordingId: recording.id,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Google Drive webhook error:', error);
    return NextResponse.json({
      error: "Failed to process webhook",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/google-drive/webhook - Webhook verification
 * 
 * Google Drive requires webhook verification
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Return the challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ status: 'ok' });
}


