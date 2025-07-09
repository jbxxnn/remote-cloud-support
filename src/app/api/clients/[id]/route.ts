import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/clients/[id] - Get a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT d.id) as "detectionCount",
        COUNT(DISTINCT u.id) as "userCount"
      FROM "Client" c
      LEFT JOIN "Detection" d ON c.id = d."clientId"
      LEFT JOIN "User" u ON c.id = u."clientId"
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = result.rows[0];

    // Get total device count (global devices)
    const deviceCount = await query('SELECT COUNT(*) as count FROM "Device"');
    const totalDevices = parseInt(deviceCount.rows[0].count);

    const clientWithCounts = {
      ...client,
      _count: {
        detections: parseInt(client.detectionCount),
        devices: totalDevices, // Global device count
        users: parseInt(client.userCount)
      }
    };
    
    return NextResponse.json(clientWithCounts);
  } catch (error) {
    console.error('Failed to fetch client:', error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

// PUT /api/clients/[id] - Update a specific client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      company, 
      address,
      timezone,
      emergencyContact,
      emergencyServicesNumber,
      serviceProviderId,
      webhookUrl, 
      notes 
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Check if email already exists for other clients
    const existingClient = await query(
      'SELECT id FROM "Client" WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (existingClient.rows.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const now = new Date();

    const result = await query(`
      UPDATE "Client" 
      SET 
        name = $1, 
        email = $2, 
        phone = $3, 
        company = $4, 
        address = $5, 
        timezone = $6, 
        "emergencyContact" = $7, 
        "emergencyServicesNumber" = $8, 
        "serviceProviderId" = $9, 
        "webhookUrl" = $10, 
        notes = $11, 
        "updatedAt" = $12
      WHERE id = $13
      RETURNING *
    `, [
      name, email, phone, company, address, timezone,
      emergencyContact, emergencyServicesNumber, serviceProviderId,
      webhookUrl, notes, now, id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = result.rows[0];

    // Get counts for the updated client
    const counts = await query(`
      SELECT 
        COUNT(DISTINCT d.id) as "detectionCount",
        COUNT(DISTINCT u.id) as "userCount"
      FROM "Client" c
      LEFT JOIN "Detection" d ON c.id = d."clientId"
      LEFT JOIN "User" u ON c.id = u."clientId"
      WHERE c.id = $1
      GROUP BY c.id
    `, [client.id]);

    // Get total device count (global devices)
    const deviceCount = await query('SELECT COUNT(*) as count FROM "Device"');
    const totalDevices = parseInt(deviceCount.rows[0].count);

    const clientWithCounts = {
      ...client,
      _count: counts.rows.length > 0 ? {
        detections: parseInt(counts.rows[0].detectionCount),
        devices: totalDevices, // Global device count
        users: parseInt(counts.rows[0].userCount)
      } : {
        detections: 0,
        devices: totalDevices, // Global device count
        users: 0
      }
    };

    return NextResponse.json(clientWithCounts);
  } catch (error) {
    console.error('Failed to update client:', error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

// DELETE /api/clients/[id] - Delete a specific client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if the client exists
    const checkResult = await query(
      'SELECT id FROM "Client" WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check if client has associated data
    const associatedData = await query(`
      SELECT 
        (SELECT COUNT(*) FROM "Detection" WHERE "clientId" = $1) as detections,
        (SELECT COUNT(*) FROM "User" WHERE "clientId" = $1) as users
    `, [id]);

    const detectionCount = parseInt(associatedData.rows[0].detections);
    const userCount = parseInt(associatedData.rows[0].users);

    if (detectionCount > 0 || userCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete client. Client has ${detectionCount} detections and ${userCount} users associated.` 
      }, { status: 400 });
    }

    // Delete the client
    await query(
      'DELETE FROM "Client" WHERE id = $1',
      [id]
    );

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error('Failed to delete client:', error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
} 