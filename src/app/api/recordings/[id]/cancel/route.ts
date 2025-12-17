import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

/**
 * POST /api/recordings/[id]/cancel - Cancel a pending recording
 * 
 * Marks a recording as cancelled if it's still pending
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recordingId = params.id;

    if (!recordingId) {
      return NextResponse.json({ error: "Recording ID is required" }, { status: 400 });
    }

    // Get the recording
    const recordingResult = await query(
      'SELECT * FROM "Recording" WHERE id = $1',
      [recordingId]
    );

    if (recordingResult.rows.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const recording = recordingResult.rows[0];

    // Only allow cancelling pending recordings
    if (recording.processingStatus !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot cancel recording with status: ${recording.processingStatus}. Only pending recordings can be cancelled.` 
      }, { status: 400 });
    }

    // Update status to cancelled
    const result = await query(
      'UPDATE "Recording" SET "processingStatus" = $1 WHERE id = $2 RETURNING *',
      ['cancelled', recordingId]
    );

    return NextResponse.json({
      success: true,
      recording: result.rows[0],
      message: 'Recording cancelled successfully'
    });
  } catch (error) {
    console.error('Failed to cancel recording:', error);
    return NextResponse.json({ 
      error: "Failed to cancel recording",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

