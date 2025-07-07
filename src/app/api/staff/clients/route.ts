import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients - Get all clients with their current status for staff
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active clients with their latest events and device counts
    const clients = await query(`
      SELECT 
        c.id,
        c.name,
        c.company,
        c."isActive",
        COUNT(DISTINCT dev.id) as "deviceCount",
        -- Get the latest detection for status determination
        MAX(d.timestamp) as "lastDetectionTime",
        MAX(d."detectionType") as "lastDetectionType",
        MAX(d.severity) as "lastDetectionSeverity"
      FROM "Client" c
      LEFT JOIN "Device" dev ON c.id = dev."clientId" AND dev."isActive" = true
      LEFT JOIN "Detection" d ON c.id = d."clientId" 
        AND d.timestamp >= NOW() - INTERVAL '24 hours'
      WHERE c."isActive" = true
      GROUP BY c.id, c.name, c.company, c."isActive"
      ORDER BY c.name
    `);

    // Transform the data to include status logic
    const clientsWithStatus = clients.rows.map((client: any) => {
      let status: 'online' | 'scheduled' | 'alert' = 'online';
      let lastEvent = null;

      // Determine status based on recent detections
      if (client.lastDetectionTime) {
        const lastDetectionTime = new Date(client.lastDetectionTime);
        const hoursSinceDetection = (Date.now() - lastDetectionTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceDetection < 1) {
          // Very recent detection - check if it's an alert
          if (client.lastDetectionSeverity === 'high' || 
              ['fall', 'door_open', 'motion'].includes(client.lastDetectionType)) {
            status = 'alert';
            lastEvent = {
              type: client.lastDetectionType,
              timestamp: client.lastDetectionTime,
              severity: client.lastDetectionSeverity
            };
          }
        } else if (hoursSinceDetection < 4) {
          // Recent activity but not urgent
          status = 'online';
        }
      }

      // Check for scheduled events (this would be expanded based on your scheduling system)
      // For now, we'll simulate some scheduled events
      const hasScheduledEvent = Math.random() < 0.1; // 10% chance for demo
      if (hasScheduledEvent && status !== 'alert') {
        status = 'scheduled';
        lastEvent = {
          type: 'scheduled_checkin',
          timestamp: new Date(Date.now() + Math.random() * 3600000).toISOString(), // Random time in next hour
          severity: 'medium'
        };
      }

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        status,
        lastEvent,
        deviceCount: parseInt(client.deviceCount),
        isActive: client.isActive
      };
    });

    return NextResponse.json(clientsWithStatus);
  } catch (error) {
    console.error('Failed to fetch clients for staff:', error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
} 