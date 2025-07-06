import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/clients - Get all clients
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT d.id) as "detectionCount",
        COUNT(DISTINCT dev.id) as "deviceCount",
        COUNT(DISTINCT u.id) as "userCount"
      FROM "Client" c
      LEFT JOIN "Detection" d ON c.id = d."clientId"
      LEFT JOIN "Device" dev ON c.id = dev."clientId"
      LEFT JOIN "User" u ON c.id = u."clientId"
      GROUP BY c.id
      ORDER BY c."createdAt" DESC
    `);
    
    // Get devices for each client
    const clientsWithDevices = await Promise.all(
      clients.rows.map(async (client: any) => {
        const devices = await query(`
          SELECT 
            dev.id,
            dev.name,
            dev."deviceType",
            dev."isActive",
            COUNT(d.id) as "detectionCount"
          FROM "Device" dev
          LEFT JOIN "Detection" d ON dev.id = d."deviceId"
          WHERE dev."clientId" = $1
          GROUP BY dev.id
        `, [client.id]);
        
        return {
          ...client,
          devices: devices.rows,
          _count: {
            detections: parseInt(client.detectionCount),
            devices: parseInt(client.deviceCount),
            users: parseInt(client.userCount)
          }
        };
      })
    );
    
    return NextResponse.json(clientsWithDevices);
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
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

    // Check if email already exists
    const existingClient = await query(
      'SELECT id FROM "Client" WHERE email = $1',
      [email]
    );

    if (existingClient.rows.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const now = new Date();

    const result = await query(`
      INSERT INTO "Client" (
        id, name, email, phone, company, address, timezone, 
        "emergencyContact", "emergencyServicesNumber", "serviceProviderId",
        "apiKey", "webhookUrl", notes, "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, 
        gen_random_uuid()::text, $10, $11, $12, $13
      )
      RETURNING *
    `, [
      name, email, phone, company, address, timezone,
      emergencyContact, emergencyServicesNumber, serviceProviderId,
      webhookUrl, notes, now, now
    ]);

    const client = result.rows[0];

    // Get counts for the new client
    const counts = await query(`
      SELECT 
        COUNT(DISTINCT d.id) as "detectionCount",
        COUNT(DISTINCT dev.id) as "deviceCount",
        COUNT(DISTINCT u.id) as "userCount"
      FROM "Client" c
      LEFT JOIN "Detection" d ON c.id = d."clientId"
      LEFT JOIN "Device" dev ON c.id = dev."clientId"
      LEFT JOIN "User" u ON c.id = u."clientId"
      WHERE c.id = $1
      GROUP BY c.id
    `, [client.id]);

    const clientWithCounts = {
      ...client,
      _count: counts.rows.length > 0 ? {
        detections: parseInt(counts.rows[0].detectionCount),
        devices: parseInt(counts.rows[0].deviceCount),
        users: parseInt(counts.rows[0].userCount)
      } : {
        detections: 0,
        devices: 0,
        users: 0
      },
      devices: []
    };

    return NextResponse.json(clientWithCounts, { status: 201 });
  } catch (error) {
    console.error('Failed to create client:', error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
} 