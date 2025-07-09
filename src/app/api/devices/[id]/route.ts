import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// PUT /api/devices/[id] - Update a device
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: deviceId } = await params;
    const body = await request.json();
    const { 
      name, 
      deviceId: newDeviceId, 
      location, 
      deviceType, 
      metadata 
    } = body;

    if (!name || !newDeviceId) {
      return NextResponse.json({ error: "Name and device ID are required" }, { status: 400 });
    }

    // Check if device exists
    const existingDevice = await query(
      'SELECT id FROM "Device" WHERE id = $1',
      [deviceId]
    );

    if (existingDevice.rows.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Check if new device ID already exists (excluding current device)
    const duplicateDevice = await query(
      'SELECT id FROM "Device" WHERE "deviceId" = $1 AND id != $2',
      [newDeviceId, deviceId]
    );

    if (duplicateDevice.rows.length > 0) {
      return NextResponse.json({ error: "Device ID already exists" }, { status: 400 });
    }

    const now = new Date();
    const result = await query(`
      UPDATE "Device" SET
        name = $1,
        "deviceId" = $2,
        location = $3,
        "deviceType" = $4,
        metadata = $5,
        "updatedAt" = $6
      WHERE id = $7
      RETURNING *
    `, [
      name, 
      newDeviceId, 
      location, 
      deviceType, 
      metadata ? JSON.stringify(metadata) : null, 
      now,
      deviceId
    ]);

    const device = result.rows[0];

    // Get detection count
    const detectionResult = await query(
      'SELECT COUNT(*) as count FROM "Detection" WHERE "deviceId" = $1',
      [deviceId]
    );

    const deviceWithClient = {
      ...device,
      client: null, // Devices are global, no client association
      _count: {
        detections: parseInt(detectionResult.rows[0].count)
      }
    };

    return NextResponse.json(deviceWithClient);
  } catch (error) {
    console.error('Failed to update device:', error);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}

// DELETE /api/devices/[id] - Delete a device
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: deviceId } = await params;

    // Check if device exists
    const existingDevice = await query(
      'SELECT id FROM "Device" WHERE id = $1',
      [deviceId]
    );

    if (existingDevice.rows.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Delete in correct order to handle foreign key constraints:
    // 1. Delete alerts that reference detections from this device
    await query(`
      DELETE FROM "Alert" 
      WHERE "detectionId" IN (
        SELECT id FROM "Detection" WHERE "deviceId" = $1
      )
    `, [deviceId]);

    // 2. Delete related detections
    await query(
      'DELETE FROM "Detection" WHERE "deviceId" = $1',
      [deviceId]
    );

    // 3. Then delete the device
    await query(
      'DELETE FROM "Device" WHERE id = $1',
      [deviceId]
    );

    return NextResponse.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error('Failed to delete device:', error);
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
  }
}

// GET /api/devices/[id] - Get a specific device
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: deviceId } = await params;

    const result = await query(`
      SELECT 
        dev.*,
        COUNT(d.id) as "detectionCount"
      FROM "Device" dev
      LEFT JOIN "Detection" d ON dev.id = d."deviceId"
      WHERE dev.id = $1
      GROUP BY dev.id
    `, [deviceId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const device = result.rows[0];
    
    // Transform the data to match expected format
    const transformedDevice = {
      ...device,
      client: null, // Devices are global, no client association
      _count: {
        detections: parseInt(device.detectionCount)
      }
    };
    
    return NextResponse.json(transformedDevice);
  } catch (error) {
    console.error('Failed to fetch device:', error);
    return NextResponse.json({ error: "Failed to fetch device" }, { status: 500 });
  }
} 