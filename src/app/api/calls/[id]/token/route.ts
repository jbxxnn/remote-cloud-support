import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import jwt from "jsonwebtoken";

/**
 * POST /api/calls/[id]/token - Generate a signaling token for a call session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id: callSessionId } = await params;

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const role = (session.user as any).role || 'user';
    const clientId = (session.user as any).clientId;

    // Verify call session exists and is not ended
    const callResult = await query(
      'SELECT id, status FROM "CallSession" WHERE id = $1',
      [callSessionId]
    );

    if (callResult.rows.length === 0) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    const callSession = callResult.rows[0];
    if (callSession.status === 'ended' || callSession.status === 'failed') {
      return NextResponse.json({ error: "Call session has already ended" }, { status: 400 });
    }

    const CALL_TOKEN_SECRET = process.env.CALL_TOKEN_SECRET;
    if (!CALL_TOKEN_SECRET) {
      throw new Error("CALL_TOKEN_SECRET not configured");
    }

    // Generate ephemeral token (valid for 15 minutes)
    const token = jwt.sign(
      { 
        userId, 
        role, 
        callSessionId,
        clientId
      },
      CALL_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    return NextResponse.json({
      token,
      signalingUrl: process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL,
      iceServers: [
        { urls: process.env.NEXT_PUBLIC_RTC_STUN_URL || "stun:stun.l.google.com:19302" }
        // Future: Add TURN servers here
      ]
    });

  } catch (error) {
    console.error('Failed to generate signaling token:', error);
    return NextResponse.json({ 
      error: "Failed to generate signaling token",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
