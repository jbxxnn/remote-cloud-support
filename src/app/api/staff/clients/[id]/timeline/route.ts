import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/timeline - Get client timeline for last 24 hours
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
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get alerts from last 24 hours
    const alertsResult = await query(`
      SELECT 
        id,
        type,
        status,
        message,
        "createdAt" as timestamp,
        'alert' as event_type
      FROM "Alert"
      WHERE "clientId" = $1
        AND "createdAt" >= $2
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, [clientId, last24Hours]);

    // Note: Event table doesn't exist - Alerts are the events in this system
    // Removed Event table query

    // Get alert events (acknowledgments, resolutions) from last 24 hours
    const alertEventsResult = await query(`
      SELECT 
        ae.id,
        ae."eventType" as type,
        a.status,
        ae.message as description,
        ae."createdAt" as timestamp,
        'status_change' as event_type
      FROM "AlertEvent" ae
      JOIN "Alert" a ON ae."alertId" = a.id
      WHERE ae."clientId" = $1
        AND ae."createdAt" >= $2
      ORDER BY ae."createdAt" DESC
      LIMIT 10
    `, [clientId, last24Hours]);

    // Combine and sort all events (Alerts and AlertEvents)
    const timeline = [
      ...alertsResult.rows.map((row: any) => ({
        timestamp: row.timestamp,
        type: row.event_type,
        status: row.status,
        description: row.message || `${row.type} alert`
      })),
      ...alertEventsResult.rows.map((row: any) => ({
        timestamp: row.timestamp,
        type: row.event_type,
        status: row.status,
        description: row.description || `${row.type} - ${row.status}`
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Limit to 10 most recent

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Failed to fetch client timeline:', error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}

