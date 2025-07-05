import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/detections - Get all detections with filtering
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const deviceId = searchParams.get('deviceId');
    const detectionType = searchParams.get('detectionType');
    const severity = searchParams.get('severity');
    const timeRange = searchParams.get('timeRange') || '24h';
    
    // Calculate time filter
    const now = new Date();
    let timeFilter = {};
    
    switch (timeRange) {
      case '1h':
        timeFilter = { gte: new Date(now.getTime() - 60 * 60 * 1000) };
        break;
      case '24h':
        timeFilter = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
        break;
      case '7d':
        timeFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        timeFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
    }
    
    const detections = await prisma.detection.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(deviceId && { deviceId }),
        ...(detectionType && { detectionType }),
        ...(severity && { severity }),
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      },
      include: { 
        client: {
          select: {
            id: true,
            name: true,
            company: true
          }
        },
        device: {
          select: {
            id: true,
            name: true,
            deviceId: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to last 100 detections
    });
    
    return NextResponse.json(detections);
  } catch (error) {
    console.error('Failed to fetch detections:', error);
    return NextResponse.json({ error: "Failed to fetch detections" }, { status: 500 });
  }
} 