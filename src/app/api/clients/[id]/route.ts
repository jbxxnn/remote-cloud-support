import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, transaction } from "@/lib/database";

async function tableExists(client: any, tableName: string) {
  const result = await client.query('SELECT to_regclass($1) as table_name', [`"${tableName}"`]);
  return Boolean(result.rows[0]?.table_name);
}

async function columnExists(client: any, tableName: string, columnName: string) {
  const result = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
  `, [tableName, columnName]);

  return result.rows.length > 0;
}

async function runIfTableExists(client: any, tableName: string, sql: string, params: any[]) {
  if (await tableExists(client, tableName)) {
    await client.query(sql, params);
  }
}

async function runIfColumnExists(
  client: any,
  tableName: string,
  columnName: string,
  sql: string,
  params: any[]
) {
  if (await tableExists(client, tableName) && await columnExists(client, tableName, columnName)) {
    await client.query(sql, params);
  }
}

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

    // Get client tags
    const tagsResult = await query(`
      SELECT id, tag, "tagType", color, "createdAt"
      FROM "ClientTag"
      WHERE "clientId" = $1
      ORDER BY "tagType", tag
    `, [id]);

    const clientWithCounts = {
      ...client,
      _count: {
        detections: parseInt(client.detectionCount),
        devices: totalDevices, // Global device count
        users: parseInt(client.userCount)
      },
      tags: tagsResult.rows
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

    await transaction(async (client) => {
      // Production databases may be on different migration states, so clean up
      // known child rows explicitly and only touch optional tables when present.
      await runIfTableExists(client, 'StaffAssignment', 'DELETE FROM "StaffAssignment" WHERE "clientId" = $1', [id]);

      await runIfTableExists(client, 'CallEvent', `
        DELETE FROM "CallEvent"
        WHERE "callSessionId" IN (
          SELECT id FROM "CallSession" WHERE "clientId" = $1
        )
      `, [id]);

      await runIfTableExists(client, 'CallParticipant', `
        DELETE FROM "CallParticipant"
        WHERE "callSessionId" IN (
          SELECT id FROM "CallSession" WHERE "clientId" = $1
        )
      `, [id]);

      await runIfTableExists(client, 'CallRecording', `
        DELETE FROM "CallRecording"
        WHERE "callSessionId" IN (
          SELECT id FROM "CallSession" WHERE "clientId" = $1
        )
      `, [id]);

      await runIfTableExists(client, 'CallSession', 'DELETE FROM "CallSession" WHERE "clientId" = $1', [id]);

      await runIfTableExists(client, 'NotationTag', `
        DELETE FROM "NotationTag"
        WHERE "recordingId" IN (
          SELECT id FROM "Recording" WHERE "clientId" = $1
        )
      `, [id]);

      await runIfTableExists(client, 'Transcript', `
        DELETE FROM "Transcript"
        WHERE "recordingId" IN (
          SELECT id FROM "Recording" WHERE "clientId" = $1
        )
        OR "alertId" IN (
          SELECT id FROM "Alert" WHERE "clientId" = $1
        )
        OR "sopResponseId" IN (
          SELECT id FROM "SOPResponse" WHERE "clientId" = $1
        )
      `, [id]);

      await runIfTableExists(client, 'Evidence', `
        DELETE FROM "Evidence"
        WHERE "alertId" IN (
          SELECT id FROM "Alert" WHERE "clientId" = $1
        )
        OR "sopResponseId" IN (
          SELECT id FROM "SOPResponse" WHERE "clientId" = $1
        )
      `, [id]);

      await runIfTableExists(client, 'Recording', 'DELETE FROM "Recording" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'Incident', 'DELETE FROM "Incident" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'AlertEvent', 'DELETE FROM "AlertEvent" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'SOPResponse', 'DELETE FROM "SOPResponse" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'Alert', 'DELETE FROM "Alert" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'Detection', 'DELETE FROM "Detection" WHERE "clientId" = $1', [id]);
      await runIfColumnExists(client, 'Device', 'clientId', 'DELETE FROM "Device" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'ClientTag', 'DELETE FROM "ClientTag" WHERE "clientId" = $1', [id]);
      await runIfTableExists(client, 'SOP', 'DELETE FROM "SOP" WHERE "clientId" = $1', [id]);

      await client.query('DELETE FROM "Client" WHERE id = $1', [id]);
      await client.query('DELETE FROM "User" WHERE "clientId" = $1 AND role = $2', [id, 'user']);
      await client.query('UPDATE "User" SET "clientId" = NULL WHERE "clientId" = $1', [id]);
    });

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error: any) {
    console.error('Failed to delete client:', error);
    console.error('Client delete details:', {
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      message: error?.message,
    });
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
} 
