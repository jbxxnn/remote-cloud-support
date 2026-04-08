import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

/**
 * POST /api/calls/[id]/end - Finalize a call session
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
    const userId = (session.user as any).id;
    const now = new Date();

    // Update the CallSession record
    const result = await query(`
      UPDATE "CallSession"
      SET 
        status = 'ended',
        "endedAt" = $1,
        "updatedAt" = $1
      WHERE id = $2 AND status != 'ended'
      RETURNING id, "clientId", "alertId"
    `, [now, callSessionId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Call session not found or already ended" }, { status: 404 });
    }

    // Log the end event
    await query(`
      INSERT INTO "CallEvent" ("callSessionId", "type", "payload")
      VALUES ($1, $2, $3)
    `, [
      callSessionId,
      'ended',
      JSON.stringify({ userId, endedAt: now })
    ]);

    return NextResponse.json({
      success: true,
      endedAt: now
    });

  } catch (error) {
    console.error('Failed to end call session:', error);
    return NextResponse.json({ 
      error: "Failed to end call session",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
