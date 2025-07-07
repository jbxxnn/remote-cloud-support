import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id] - Get specific client details for staff
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clientId = params.id;

    // Get client details
    const client = await query(`
      SELECT 
        c.id,
        c.name,
        c.company,
        c.address,
        c.timezone,
        c."emergencyContact",
        c."emergencyServicesNumber",
        c."isActive",
        -- Get the latest detection for status determination
        MAX(d.timestamp) as "lastDetectionTime",
        MAX(d."detectionType") as "lastDetectionType",
        MAX(d.severity) as "lastDetectionSeverity"
      FROM "Client" c
      LEFT JOIN "Detection" d ON c.id = d."clientId" 
        AND d.timestamp >= NOW() - INTERVAL '24 hours'
      WHERE c.id = $1 AND c."isActive" = true
      GROUP BY c.id, c.name, c.company, c.address, c.timezone, 
               c."emergencyContact", c."emergencyServicesNumber", c."isActive"
    `, [clientId]);

    if (client.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const clientData = client.rows[0];

    // Determine status based on recent detections
    let status: 'online' | 'scheduled' | 'alert' = 'online';
    
    if (clientData.lastDetectionTime) {
      const lastDetectionTime = new Date(clientData.lastDetectionTime);
      const hoursSinceDetection = (Date.now() - lastDetectionTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceDetection < 1) {
        // Very recent detection - check if it's an alert
        if (clientData.lastDetectionSeverity === 'high' || 
            ['fall', 'door_open', 'motion'].includes(clientData.lastDetectionType)) {
          status = 'alert';
        }
      } else if (hoursSinceDetection < 4) {
        // Recent activity but not urgent
        status = 'online';
      }
    }

    // Check for scheduled events (this would be expanded based on your scheduling system)
    const hasScheduledEvent = Math.random() < 0.1; // 10% chance for demo
    if (hasScheduledEvent && status !== 'alert') {
      status = 'scheduled';
    }

    const clientWithStatus = {
      id: clientData.id,
      name: clientData.name,
      company: clientData.company,
      address: clientData.address,
      timezone: clientData.timezone,
      emergencyContact: clientData.emergencyContact,
      emergencyServicesNumber: clientData.emergencyServicesNumber,
      status,
      isActive: clientData.isActive
    };

    return NextResponse.json(clientWithStatus);
  } catch (error) {
    console.error('Failed to fetch client details:', error);
    return NextResponse.json({ error: "Failed to fetch client details" }, { status: 500 });
  }
} 