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

    console.log('[ALERTS PATCH] Client ID:', clientId);
    console.log('[ALERTS PATCH] Action:', action);
    console.log('[ALERTS PATCH] Alert ID provided:', alertId);
    console.log('[ALERTS PATCH] Current user ID:', currentUserId);

    // First, let's see what alerts exist for this client
    const allAlertsResult = await query(`
      SELECT id, status, type, message, "createdAt" 
      FROM "Alert" 
      WHERE "clientId" = $1
      ORDER BY "createdAt" DESC
    `, [clientId]);

    console.log('[ALERTS PATCH] All alerts for client:', allAlertsResult.rows);

    // If alertId is provided, use it; otherwise get the most recent pending alert
    let targetAlertId = alertId;
    if (!targetAlertId) {
      const alertResult = await query(`
        SELECT id, status, type, message FROM "Alert" 
        WHERE "clientId" = $1 AND status IN ('pending', 'acknowledged')
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [clientId]);

      console.log('[ALERTS PATCH] Pending/acknowledged alerts found:', alertResult.rows);

      if (alertResult.rows.length === 0) {
        console.log('[ALERTS PATCH] No pending alert found - returning 404');
        return NextResponse.json({ error: "No pending alert found for this client" }, { status: 404 });
      }
      targetAlertId = alertResult.rows[0].id;
      console.log('[ALERTS PATCH] Using alert ID:', targetAlertId);
    }

    let eventType = null;
    let alertEventMessage = notes || null;
    let metadata = null;
    let updateResult;

    switch (action) {
      case 'acknowledge':
        console.log('[ALERTS PATCH] Acknowledging alert:', targetAlertId);
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
        console.log('[ALERTS PATCH] Resolving alert:', targetAlertId);
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
        console.log('[ALERTS PATCH] Invalid action:', action);
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    console.log('[ALERTS PATCH] Update result:', updateResult);

    // Log the action in AlertEvent
    if (eventType) {
      console.log('[ALERTS PATCH] Logging alert event:', eventType);
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

    console.log('[ALERTS PATCH] Success - returning response');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ALERTS PATCH] Error:', error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
} 