import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/detections/stats - Get detection statistics
export async function GET() {
  const session = await getServerSession(authOptions);
  
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get total detections
    const totalResult = await query('SELECT COUNT(*) as count FROM "Detection"');
    const total = parseInt(totalResult.rows[0].count);
    
    // Get today's detections
    const todayResult = await query(
      'SELECT COUNT(*) as count FROM "Detection" WHERE timestamp >= $1',
      [todayStart]
    );
    const today = parseInt(todayResult.rows[0].count);
    
    // Get detections by type
    const byTypeResult = await query(`
      SELECT "detectionType", COUNT(*) as count
      FROM "Detection"
      GROUP BY "detectionType"
    `);
    
    // Get detections by severity
    const bySeverityResult = await query(`
      SELECT severity, COUNT(*) as count
      FROM "Detection"
      GROUP BY severity
    `);
    
    // Convert to expected format
    const typeStats: Record<string, number> = {};
    byTypeResult.rows.forEach((item: any) => {
      typeStats[item.detectionType] = parseInt(item.count);
    });
    
    const severityStats: Record<string, number> = {};
    bySeverityResult.rows.forEach((item: any) => {
      severityStats[item.severity] = parseInt(item.count);
    });
    
    return NextResponse.json({
      total,
      today,
      byType: typeStats,
      bySeverity: severityStats
    });
  } catch (error) {
    console.error('Failed to fetch detection stats:', error);
    return NextResponse.json({ error: "Failed to fetch detection stats" }, { status: 500 });
  }
} 