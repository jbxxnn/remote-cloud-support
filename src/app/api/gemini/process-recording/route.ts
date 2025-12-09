import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { processRecording, validateRecordingFormat } from "@/lib/gemini/recording-processor";

/**
 * POST /api/gemini/process-recording - Process a recording with Gemini
 * 
 * This endpoint processes audio/video recordings for transcription and analysis.
 * For MVP, this validates the file and queues it for processing.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const recordingId = formData.get('recordingId') as string;
    const file = formData.get('file') as File | null;

    if (!recordingId) {
      return NextResponse.json({ error: "recordingId is required" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Verify recording exists
    const recordingResult = await query(
      'SELECT id, "processingStatus" FROM "Recording" WHERE id = $1',
      [recordingId]
    );

    if (recordingResult.rows.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file format
    const fileInfo = {
      buffer,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
    };

    const validation = validateRecordingFormat(fileInfo);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 });
    }

    // Update status to processing
    await query(
      'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
      ['processing', recordingId]
    );

    try {
      // Process recording
      const result = await processRecording(recordingId, fileInfo);

      if (result.success) {
        // Update status to completed
        await query(
          'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
          ['completed', recordingId]
        );

        return NextResponse.json({
          success: true,
          recordingId,
          processingTime: result.processingTime,
          message: "Recording processed successfully",
        });
      } else {
        // Update status to failed
        await query(
          'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
          ['failed', recordingId]
        );

        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 500 });
      }
    } catch (processingError) {
      // Update status to failed
      await query(
        'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2',
        ['failed', recordingId]
      );

      throw processingError;
    }
  } catch (error) {
    console.error('Failed to process recording:', error);
    return NextResponse.json({ 
      error: "Failed to process recording",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

