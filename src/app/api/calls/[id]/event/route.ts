import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

/**
 * POST /api/calls/[id]/event - Log an event for a call session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const callSessionId = params.id;

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, payload } = body;

    if (!type) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    // Optional: role-based checks for certain types here

    await query(`
      INSERT INTO "CallEvent" ("callSessionId", "type", "payload")
      VALUES ($1, $2, $3)
    `, [
      callSessionId,
      type,
      payload ? JSON.stringify(payload) : null
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to log call event:', error);
    return NextResponse.json({ 
      error: "Failed to log call event",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
