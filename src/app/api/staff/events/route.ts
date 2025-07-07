import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/events - Get events for staff dashboard
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const currentUserId = (session.user as any).id;

    let whereClause = '';
    let params: any[] = [];
    let paramCount = 1;

    // Build filter conditions
    switch (filter) {
      case 'my-queue':
        whereClause = `WHERE e.status = 'assigned' AND e."assignedTo" = $${paramCount}`;
        params.push(currentUserId);
        paramCount++;
        break;
      case 'new-events':
        whereClause = `WHERE e.status IN ('pending', 'alert')`;
        break;
      case 'all':
      default:
        whereClause = `WHERE e.status IN ('pending', 'assigned', 'alert')`;
        break;
    }

    // Get events with client information
    const events = await query(`
      SELECT 
        e.id,
        e."clientId",
        c.name as "clientName",
        e.type,
        e.severity,
        e.status,
        e.timestamp,
        e."assignedTo",
        e.description,
        e."createdAt"
      FROM "Event" e
      LEFT JOIN "Client" c ON e."clientId" = c.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN e.severity = 'high' THEN 1
          WHEN e.severity = 'medium' THEN 2
          WHEN e.severity = 'low' THEN 3
        END,
        e.timestamp DESC
      LIMIT 50
    `, params);

    // Transform the data
    const transformedEvents = events.rows.map((event: any) => ({
      id: event.id,
      clientId: event.clientId,
      clientName: event.clientName,
      type: event.type,
      severity: event.severity,
      status: event.status,
      timestamp: event.timestamp,
      assignedTo: event.assignedTo,
      description: event.description
    }));

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error('Failed to fetch events for staff:', error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
} 