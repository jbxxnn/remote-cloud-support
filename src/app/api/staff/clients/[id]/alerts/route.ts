import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/alerts - Get alerts for a specific client
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'acknowledged', 'resolved'

    let whereClause = 'WHERE a."clientId" = $1';
    let queryParams = [clientId];

    if (status) {
      if (status.includes(',')) {
        // Handle multiple statuses (e.g., "acknowledged,resolved")
        const statuses = status.split(',');
        const placeholders = statuses.map((_, index) => `$${index + 2}`).join(', ');
        whereClause += ` AND a.status IN (${placeholders})`;
        queryParams.push(...statuses);
      } else {
        // Handle single status
        whereClause += ' AND a.status = $2';
        queryParams.push(status);
      }
    }

    const alerts = await query(`
      SELECT 
        a.id,
        a.type,
        a.status,
        a.message,
        a."sentAt",
        a."createdAt",
        d.location,
        d."clipUrl",
        d.severity,
        d."detectionType"
      FROM "Alert" a
      LEFT JOIN "Detection" d ON a."detectionId" = d.id
      ${whereClause}
      ORDER BY a."createdAt" DESC
    `, queryParams);

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

// PATCH /api/staff/clients/[id]/alerts - Update alert status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: clientId } = await params;
    const { alertId, action, notes } = await request.json();
    const currentUserId = (session.user as any).id;
    const now = new Date();

    switch (action) {
      case 'acknowledge':
        await query(`
          UPDATE "Alert" 
          SET 
            status = 'acknowledged',
            "updatedAt" = $1
          WHERE id = $2 AND "clientId" = $3
        `, [now, alertId, clientId]);
        break;

      case 'resolve':
        await query(`
          UPDATE "Alert" 
          SET 
            status = 'resolved',
            "updatedAt" = $1
          WHERE id = $2 AND "clientId" = $3
        `, [now, alertId, clientId]);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
} 