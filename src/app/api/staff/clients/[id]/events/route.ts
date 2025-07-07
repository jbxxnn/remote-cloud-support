import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/events - Get client events
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

    const result = await query(`
      SELECT 
        e.id, e.type, e.severity, e.status, e."createdAt" as timestamp,
        e.description, e."acknowledgedAt", e."resolvedAt",
        d.location, d."clipUrl"
      FROM "Event" e
      LEFT JOIN "Detection" d ON e."detectionId" = d.id
      WHERE e."clientId" = $1
      ORDER BY e."createdAt" DESC
      LIMIT 50
    `, [clientId]);

    const events = result.rows.map((event: any) => ({
      id: event.id,
      type: event.type,
      severity: event.severity,
      status: event.status,
      timestamp: event.timestamp,
      location: event.location || 'Unknown',
      description: event.description || `${event.type} event`,
      hasVideo: !!event.clipUrl,
      videoUrl: event.clipUrl,
      acknowledged: !!event.acknowledgedAt
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch client events:', error);
    return NextResponse.json({ error: "Failed to fetch client events" }, { status: 500 });
  }
} 