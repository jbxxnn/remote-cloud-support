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

    // Debugging logs
    console.log('[ALERTS API] Fetching alerts for client:', clientId);
    console.log('[ALERTS API] Status filter:', status);
    console.log('[ALERTS API] SQL:', whereClause);
    console.log('[ALERTS API] Params:', queryParams);

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

    console.log('[ALERTS API] Alerts returned:', alerts.rows.length);

    return NextResponse.json(alerts.rows);
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
    const { action, notes, outcome, alertId } = await request.json();
    const currentUserId = (session.user as any).id;
    const now = new Date();

    // If alertId is provided, use it; otherwise get the most recent pending alert
    let targetAlertId = alertId;
    if (!targetAlertId) {
      const alertResult = await query(`
        SELECT id FROM "Alert" 
        WHERE "clientId" = $1 AND status IN ('pending', 'acknowledged')
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [clientId]);

      if (alertResult.rows.length === 0) {
        return NextResponse.json({ error: "No pending alert found for this client" }, { status: 404 });
      }
      targetAlertId = alertResult.rows[0].id;
    }

    let eventType = null;
    let alertEventMessage = notes || null;
    let metadata = null;
    let updateResult;

    switch (action) {
      case 'acknowledge':
        updateResult = await query(`
          UPDATE "Alert" 
          SET 
            status = 'scheduled',
            "assignedTo" = $1,
            "updatedAt" = $2
          WHERE id = $3 AND "clientId" = $4
        `, [currentUserId, now, targetAlertId, clientId]);
        eventType = 'acknowledged';
        break;

      case 'resolve':
        updateResult = await query(`
          UPDATE "Alert" 
          SET 
            status = 'resolved',
            "updatedAt" = $1
          WHERE id = $2 AND "clientId" = $3
        `, [now, targetAlertId, clientId]);
        eventType = 'resolved';
        
        // Create metadata with outcome and notes
        metadata = {
          outcome: outcome || null,
          notes: notes || null,
          resolvedAt: now.toISOString(),
          resolvedBy: currentUserId
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Log the action in AlertEvent
    if (eventType) {
      await query(`
        INSERT INTO "AlertEvent" (id, "alertId", "clientId", "staffId", "eventType", "message", "metadata", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $7)
      `, [
        targetAlertId,
        clientId,
        currentUserId,
        eventType,
        alertEventMessage,
        metadata ? JSON.stringify(metadata) : null,
        now
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
} 