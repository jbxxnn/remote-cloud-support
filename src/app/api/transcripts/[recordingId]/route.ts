import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranscript } from "@/lib/gemini/transcription-service";

/**
 * GET /api/transcripts/[recordingId] - Get transcript for a recording
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recordingId } = await params;
    const transcript = await getTranscript(recordingId);

    if (!transcript) {
      return NextResponse.json({ 
        error: "Transcript not found",
        message: "This recording has not been transcribed yet"
      }, { status: 404 });
    }

    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Failed to get transcript:', error);
    return NextResponse.json({ 
      error: "Failed to get transcript",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

