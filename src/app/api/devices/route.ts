import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/devices - Get all devices
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    let devices;
    if (clientId) {
      // Since devices are global, we don't filter by clientId anymore
      // Just return all devices
      devices = await query(`
        SELECT 
          dev.*,
          COUNT(d.id) as "detectionCount"
        FROM "Device" dev
        LEFT JOIN "Detection" d ON dev.id = d."deviceId"
        GROUP BY dev.id
        ORDER BY dev."createdAt" DESC
      `);
    } else {
      devices = await query(`
        SELECT 
          dev.*,
          COUNT(d.id) as "detectionCount"
        FROM "Device" dev
        LEFT JOIN "Detection" d ON dev.id = d."deviceId"
        GROUP BY dev.id
        ORDER BY dev."createdAt" DESC
      `);
    }
    
    // Transform the data to match expected format
    const transformedDevices = devices.rows.map((device: any) => ({
      ...device,
      metadata: device.metadata ? JSON.parse(device.metadata) : null,
      client: null, // Devices are global, no client association
      _count: {
        detections: parseInt(device.detectionCount)
      }
    }));
    
    return NextResponse.json(transformedDevices);
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

// POST /api/devices - Create a new device
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      clientId, 
      name, 
      deviceId, 
      location, 
      deviceType, 
      metadata 
    } = body;

    if (!name || !deviceId) {
      return NextResponse.json({ error: "Name and device ID are required" }, { status: 400 });
    }

    // Check if device ID already exists (devices are global)
    const existingDevice = await query(
      'SELECT id FROM "Device" WHERE "deviceId" = $1',
      [deviceId]
    );

    if (existingDevice.rows.length > 0) {
      return NextResponse.json({ error: "Device ID already exists for this client" }, { status: 400 });
    }

    const now = new Date();
    const result = await query(`
      INSERT INTO "Device" (
        id, name, "deviceId", location, "deviceType", metadata, "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name, 
      deviceId, 
      location, 
      deviceType || 'camera', 
      metadata ? JSON.stringify(metadata) : null, 
      now, 
      now
    ]);

    const device = result.rows[0];

    const deviceWithClient = {
      ...device,
      client: null, // Devices are global, no client association
      _count: {
        detections: 0
      }
    };

    return NextResponse.json(deviceWithClient, { status: 201 });
  } catch (error) {
    console.error('Failed to create device:', error);
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
} 