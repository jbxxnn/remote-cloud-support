import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transaction } from "@/lib/database";

/**
 * POST /api/calls/create - Initialize a new WebRTC call session
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !["staff", "admin"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, alertId, sopResponseId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const callSessionId = await transaction(async (client) => {
      const result = await client.query(`
        INSERT INTO "CallSession" (
          "clientId", "alertId", "sopResponseId", 
          "initiatedBy", "status"
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        clientId,
        alertId || null,
        sopResponseId || null,
        userId,
        'pending'
      ]);

      const newCallSessionId = result.rows[0].id;

      await client.query(`
        INSERT INTO "CallRecording" ("callSessionId", "processingStatus")
        VALUES ($1, $2)
      `, [newCallSessionId, 'pending']);

      await client.query(`
        INSERT INTO "CallEvent" ("callSessionId", "type", "payload")
        VALUES ($1, $2, $3)
      `, [
        newCallSessionId,
        'created',
        JSON.stringify({ userId, clientId, alertId })
      ]);

      return newCallSessionId;
    });

    return NextResponse.json({
      callSessionId,
      status: 'pending'
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create call session:', error);
    return NextResponse.json({ 
      error: "Failed to create call session",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
