import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { generateGoogleMeetLink } from "@/lib/google-meet/meet-service";

/**
 * POST /api/google-meet/create-recording - Create a Google Meet recording record
 * 
 * Creates a pending recording record and generates a Google Meet link
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { alertId, clientId, sopResponseId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Generate Google Meet link
    const meetLink = generateGoogleMeetLink({
      alertId,
      clientId,
      staffId: userId,
      sopResponseId,
    });

    // Create pending recording record
    const result = await query(`
      INSERT INTO "Recording" (
        "alertId", "sopResponseId", "clientId", "recordingType",
        "source", "meetingId", "meetingUrl", "processingStatus",
        "recordedBy"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      alertId || null,
      sopResponseId || null,
      clientId,
      'video', // Google Meet recordings are video
      'google_meet',
      meetLink.meetingId,
      meetLink.meetingUrl,
      'pending',
      userId
    ]);

    return NextResponse.json({
      recording: result.rows[0],
      meetLink: meetLink.meetingUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create Google Meet recording:', error);
    return NextResponse.json({ 
      error: "Failed to create Google Meet recording",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

