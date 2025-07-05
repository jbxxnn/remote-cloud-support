import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

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
    let timeFilter: { gte?: Date } = {};
    
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
    
    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (clientId) {
      whereConditions.push(`d."clientId" = $${paramCount}`);
      params.push(clientId);
      paramCount++;
    }

    if (deviceId) {
      whereConditions.push(`d."deviceId" = $${paramCount}`);
      params.push(deviceId);
      paramCount++;
    }

    if (detectionType) {
      whereConditions.push(`d."detectionType" = $${paramCount}`);
      params.push(detectionType);
      paramCount++;
    }

    if (severity) {
      whereConditions.push(`d.severity = $${paramCount}`);
      params.push(severity);
      paramCount++;
    }

    if (Object.keys(timeFilter).length > 0 && timeFilter.gte) {
      whereConditions.push(`d.timestamp >= $${paramCount}`);
      params.push(timeFilter.gte);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const detections = await query(`
      SELECT 
        d.*,
        c.id as "clientId",
        c.name as "clientName",
        c.company as "clientCompany",
        dev.id as "deviceId",
        dev.name as "deviceName",
        dev."deviceId" as "deviceDeviceId"
      FROM "Detection" d
      LEFT JOIN "Client" c ON d."clientId" = c.id
      LEFT JOIN "Device" dev ON d."deviceId" = dev.id
      ${whereClause}
      ORDER BY d.timestamp DESC
      LIMIT 100
    `, params);
    
    return NextResponse.json(detections.rows);
  } catch (error) {
    console.error('Failed to fetch detections:', error);
    return NextResponse.json({ error: "Failed to fetch detections" }, { status: 500 });
  }
} 