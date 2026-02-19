import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { processMeetRecording } from "@/lib/google-meet/recording-processor";

/**
 * POST /api/google-meet/process-recording - Manually trigger processing of a Google Meet recording
 * 
 * This endpoint allows staff to manually trigger processing if automatic webhook didn't work
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recordingId, videoDriveFileId, transcriptDriveFileId } = body;

    if (!recordingId) {
      return NextResponse.json({ error: "recordingId is required" }, { status: 400 });
    }

    // Verify recording exists and belongs to Google Meet
    const recordingResult = await query(
      'SELECT * FROM "Recording" WHERE id = $1 AND "source" = $2',
      [recordingId, 'google_meet']
    );

    if (recordingResult.rows.length === 0) {
      return NextResponse.json({ 
        error: "Recording not found or not a Google Meet recording" 
      }, { status: 404 });
    }

    const recording = recordingResult.rows[0];

    // Check if already processing or completed
    if (recording.processingStatus === 'processing') {
      return NextResponse.json({ 
        error: "Recording is already being processed",
        status: 'processing'
      }, { status: 409 });
    }

    if (recording.processingStatus === 'completed') {
      return NextResponse.json({ 
        message: "Recording already processed",
        status: 'completed'
      });
    }

    // Process the recording
    const result = await processMeetRecording({
      recordingId,
      videoDriveFileId: videoDriveFileId || recording.videoDriveFileId,
      transcriptDriveFileId: transcriptDriveFileId || recording.transcriptDriveFileId,
      meetingId: recording.meetingId,
      meetingStartTime: recording.createdAt ? new Date(recording.createdAt) : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        recordingId,
        transcriptId: result.transcriptId,
        processingTime: result.processingTime,
        message: "Recording processed successfully",
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to process Meet recording:', error);
    return NextResponse.json({ 
      error: "Failed to process recording",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


