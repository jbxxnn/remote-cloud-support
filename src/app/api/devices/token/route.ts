import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

/**
 * GET /api/devices/token - Generate a persistent signaling token for a device
 * This allows the device to listen for incoming call invites.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const role = (session.user as any).role || 'device';
    const clientId = (session.user as any).clientId;

    const CALL_TOKEN_SECRET = process.env.CALL_TOKEN_SECRET;
    if (!CALL_TOKEN_SECRET) {
      throw new Error("CALL_TOKEN_SECRET not configured");
    }

    // Generate token without callSessionId (persistent device connection)
    const token = jwt.sign(
      { 
        userId, 
        role,
        clientId
      },
      CALL_TOKEN_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      token,
      signalingUrl: process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL,
      iceServers: [
        { urls: process.env.NEXT_PUBLIC_RTC_STUN_URL || "stun:stun.l.google.com:19302" }
      ]
    });

  } catch (error) {
    console.error('Failed to generate device token:', error);
    return NextResponse.json({ 
      error: "Failed to generate device token" 
    }, { status: 500 });
  }
}
