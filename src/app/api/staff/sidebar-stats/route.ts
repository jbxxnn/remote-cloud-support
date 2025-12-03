import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/sidebar-stats - Get live counters for sidebar
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentUserId = (session.user as any).id;

    // Get active alerts count (pending)
    const activeAlerts = await query(`
      SELECT COUNT(*) as count
      FROM "Alert" a
      INNER JOIN "Client" c ON a."clientId" = c.id
      WHERE a.status = 'pending'
      AND c."isActive" = true
    `);

    // Get scheduled alerts count
    const scheduledAlerts = await query(`
      SELECT COUNT(*) as count
      FROM "Alert" a
      INNER JOIN "Client" c ON a."clientId" = c.id
      WHERE a.status = 'scheduled'
      AND c."isActive" = true
    `);

    // Get my queue count (alerts assigned to current user)
    const myQueue = await query(`
      SELECT COUNT(*) as count
      FROM "Alert" a
      INNER JOIN "Client" c ON a."clientId" = c.id
      WHERE a."assignedTo" = $1
      AND a.status IN ('pending', 'scheduled')
      AND c."isActive" = true
    `, [currentUserId]);

    // Get active clients count
    const activeClients = await query(`
      SELECT COUNT(*) as count
      FROM "Client"
      WHERE "isActive" = true
    `);

    // Get open SOPs count (SOPs with pending responses)
    const openSOPs = await query(`
      SELECT COUNT(DISTINCT s.id) as count
      FROM "SOP" s
      INNER JOIN "Client" c ON s."clientId" = c.id
      WHERE c."isActive" = true
      AND s."isActive" = true
    `);

    // Get active staff count
    const activeStaff = await query(`
      SELECT COUNT(*) as count
      FROM "User"
      WHERE role = 'staff'
      AND "isActive" = true
    `);

    // Get resolved today count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = await query(`
      SELECT COUNT(*) as count
      FROM "Alert" a
      INNER JOIN "Client" c ON a."clientId" = c.id
      WHERE a.status = 'resolved'
      AND a."updatedAt" >= $1
      AND c."isActive" = true
    `, [today.toISOString()]);

    return NextResponse.json({
      activeAlerts: parseInt(activeAlerts.rows[0]?.count || "0"),
      scheduledAlerts: parseInt(scheduledAlerts.rows[0]?.count || "0"),
      myQueue: parseInt(myQueue.rows[0]?.count || "0"),
      activeClients: parseInt(activeClients.rows[0]?.count || "0"),
      openSOPs: parseInt(openSOPs.rows[0]?.count || "0"),
      activeStaff: parseInt(activeStaff.rows[0]?.count || "0"),
      resolvedToday: parseInt(resolvedToday.rows[0]?.count || "0"),
    });
  } catch (error) {
    console.error('Failed to fetch sidebar stats:', error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}





