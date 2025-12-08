import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/recordings - Get recordings
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');
    const sopResponseId = searchParams.get('sopResponseId');
    const clientId = searchParams.get('clientId');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (alertId) {
      whereClause += ` AND "alertId" = $${paramIndex}`;
      params.push(alertId);
      paramIndex++;
    }

    if (sopResponseId) {
      whereClause += ` AND "sopResponseId" = $${paramIndex}`;
      params.push(sopResponseId);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND "clientId" = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        r.*,
        u.name as "recordedByName"
      FROM "Recording" r
      LEFT JOIN "User" u ON r."recordedBy" = u.id
      ${whereClause}
      ORDER BY r."createdAt" DESC
    `, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch recordings:', error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}

// POST /api/recordings - Create recording record
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      alertId,
      sopResponseId,
      clientId,
      recordingType,
      fileUrl,
      filePath,
      fileName,
      mimeType,
      fileSize,
      duration
    } = body;

    if (!clientId || !recordingType) {
      return NextResponse.json({ error: "clientId and recordingType are required" }, { status: 400 });
    }

    if (!['video', 'audio', 'screen'].includes(recordingType)) {
      return NextResponse.json({ error: "recordingType must be 'video', 'audio', or 'screen'" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const result = await query(`
      INSERT INTO "Recording" (
        "alertId", "sopResponseId", "clientId", "recordingType",
        "fileUrl", "filePath", "fileName", "mimeType", "fileSize", "duration",
        "recordedBy"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      alertId || null,
      sopResponseId || null,
      clientId,
      recordingType,
      fileUrl || null,
      filePath || null,
      fileName || null,
      mimeType || null,
      fileSize || null,
      duration || null,
      userId
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create recording:', error);
    return NextResponse.json({ error: "Failed to create recording" }, { status: 500 });
  }
}

