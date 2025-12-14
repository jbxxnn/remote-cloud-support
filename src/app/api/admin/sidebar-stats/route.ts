import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/admin/sidebar-stats - Get live counters for admin sidebar
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get active clients count
    const activeClients = await query(`
      SELECT COUNT(*) as count
      FROM "Client"
      WHERE "isActive" = true
    `);

    // Get active devices count
    const activeDevices = await query(`
      SELECT COUNT(*) as count
      FROM "Device"
      WHERE "isActive" = true
    `);

    // Get active SOPs count
    const activeSOPs = await query(`
      SELECT COUNT(*) as count
      FROM "SOP"
      WHERE "isActive" = true
    `);

    // Get active staff count
    const activeStaff = await query(`
      SELECT COUNT(*) as count
      FROM "User"
      WHERE role = 'staff'
      AND "isActive" = true
    `);

    // Get pending alerts count
    const pendingAlerts = await query(`
      SELECT COUNT(*) as count
      FROM "Alert" a
      INNER JOIN "Client" c ON a."clientId" = c.id
      WHERE a.status = 'pending'
      AND c."isActive" = true
    `);

    // Get total logs count (last 24 hours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentLogs = await query(`
      SELECT COUNT(*) as count
      FROM "AlertEvent"
      WHERE "createdAt" >= $1
    `, [today.toISOString()]);

    return NextResponse.json({
      activeClients: parseInt(activeClients.rows[0]?.count || "0"),
      activeDevices: parseInt(activeDevices.rows[0]?.count || "0"),
      activeSOPs: parseInt(activeSOPs.rows[0]?.count || "0"),
      activeStaff: parseInt(activeStaff.rows[0]?.count || "0"),
      pendingAlerts: parseInt(pendingAlerts.rows[0]?.count || "0"),
      recentLogs: parseInt(recentLogs.rows[0]?.count || "0"),
    });
  } catch (error) {
    console.error('Failed to fetch admin sidebar stats:', error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}









