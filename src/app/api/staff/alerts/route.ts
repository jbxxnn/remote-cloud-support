import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/alerts - Get all pending alerts across all clients for staff dashboard
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending,scheduled'; // Default to active alerts
    const limit = parseInt(searchParams.get('limit') || '20');

    let statuses = status.includes(',') ? status.split(',') : [status];

    const alerts = await query(`
      SELECT 
        a.id,
        a.type,
        a.status,
        a.message,
        a."sentAt",
        a."createdAt",
        a."clientId",
        c.name as "clientName",
        c.company as "clientCompany",
        d.location,
        d."clipUrl",
        d.severity,
        d."detectionType"
      FROM "Alert" a
      LEFT JOIN "Client" c ON a."clientId" = c.id
      LEFT JOIN "Detection" d ON a."detectionId" = d.id
      WHERE a.status = ANY($1::text[])
      AND c."isActive" = true
      ORDER BY a."createdAt" DESC
      LIMIT $2
    `, [statuses, limit]);

    return NextResponse.json(alerts.rows);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}


