import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/events - Get events for a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clientId = params.id;

    // Get events for this client
    const events = await query(`
      SELECT 
        e.id,
        e.type,
        e.severity,
        e.status,
        e.description,
        e.timestamp,
        e."assignedTo",
        e."acknowledgedAt",
        e."resolvedAt",
        d.location,
        d."clipUrl"
      FROM "Event" e
      LEFT JOIN "Detection" d ON e."detectionId" = d.id
      WHERE e."clientId" = $1
      ORDER BY e.timestamp DESC
      LIMIT 50
    `, [clientId]);

    // Transform the data
    const transformedEvents = events.rows.map((event: any) => ({
      id: event.id,
      type: event.type,
      severity: event.severity,
      status: event.status,
      description: event.description,
      timestamp: event.timestamp,
      location: event.location,
      clipUrl: event.clipUrl,
      assignedTo: event.assignedTo,
      acknowledgedAt: event.acknowledgedAt,
      resolvedAt: event.resolvedAt
    }));

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error('Failed to fetch client events:', error);
    return NextResponse.json({ error: "Failed to fetch client events" }, { status: 500 });
  }
} 