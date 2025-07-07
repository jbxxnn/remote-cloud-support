import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/sops - Get client SOPs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: clientId } = await params;

    // For now, return some sample SOPs. In a real implementation,
    // you might have client-specific SOPs or general SOPs
    const sops = [
      {
        id: "sop-1",
        title: "Fall Detection Response",
        content: "When a fall is detected: 1) Immediately attempt to contact the client via video call. 2) If no response, check the video clip for severity. 3) If serious, contact emergency services immediately. 4) Document all actions taken.",
        eventType: "detection"
      },
      {
        id: "sop-2", 
        title: "Scheduled Check-in Procedure",
        content: "For scheduled check-ins: 1) Initiate video call at scheduled time. 2) Verify client is safe and well. 3) Ask about any concerns or needs. 4) Document the interaction.",
        eventType: "scheduled"
      },
      {
        id: "sop-3",
        title: "Emergency Escalation",
        content: "If emergency services are needed: 1) Call 911 immediately. 2) Provide client location and situation details. 3) Stay on the line until help arrives. 4) Notify family/emergency contacts.",
        eventType: "detection"
      }
    ];

    return NextResponse.json(sops);
  } catch (error) {
    console.error('Failed to fetch client SOPs:', error);
    return NextResponse.json({ error: "Failed to fetch client SOPs" }, { status: 500 });
  }
} 