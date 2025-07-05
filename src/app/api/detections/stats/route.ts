import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/detections/stats - Get detection statistics
export async function GET() {
  const session = await getServerSession(authOptions);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get total detections
    const total = await prisma.detection.count();
    
    // Get today's detections
    const today = await prisma.detection.count({
      where: {
        timestamp: {
          gte: todayStart
        }
      }
    });
    
    // Get detections by type
    const byType = await prisma.detection.groupBy({
      by: ['detectionType'],
      _count: {
        detectionType: true
      }
    });
    
    // Get detections by severity
    const bySeverity = await prisma.detection.groupBy({
      by: ['severity'],
      _count: {
        severity: true
      }
    });
    
    // Convert to expected format
    const typeStats: Record<string, number> = {};
    byType.forEach(item => {
      typeStats[item.detectionType] = item._count.detectionType;
    });
    
    const severityStats: Record<string, number> = {};
    bySeverity.forEach(item => {
      severityStats[item.severity] = item._count.severity;
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