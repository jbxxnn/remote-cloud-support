import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/evidence - Get evidence for SOP responses or alerts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sopResponseId = searchParams.get('sopResponseId');
    const alertId = searchParams.get('alertId');

    if (!sopResponseId && !alertId) {
      return NextResponse.json({ error: "sopResponseId or alertId is required" }, { status: 400 });
    }

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (sopResponseId) {
      whereClause = `WHERE "sopResponseId" = $${paramIndex}`;
      params.push(sopResponseId);
      paramIndex++;
    }

    if (alertId) {
      if (whereClause) {
        whereClause += ` OR "alertId" = $${paramIndex}`;
      } else {
        whereClause = `WHERE "alertId" = $${paramIndex}`;
      }
      params.push(alertId);
    }

    const result = await query(`
      SELECT 
        e.id,
        e."sopResponseId",
        e."alertId",
        e."evidenceType",
        e."fileUrl",
        e."filePath",
        e."fileName",
        e."mimeType",
        e."fileSize",
        e."description",
        e."uploadedBy",
        e."createdAt",
        u.name as "uploadedByName"
      FROM "Evidence" e
      LEFT JOIN "User" u ON e."uploadedBy" = u.id
      ${whereClause}
      ORDER BY e."createdAt" DESC
    `, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch evidence:', error);
    return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 });
  }
}

// POST /api/evidence - Create evidence record (file upload handled separately)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      sopResponseId,
      alertId,
      evidenceType,
      fileUrl,
      filePath,
      fileName,
      mimeType,
      fileSize,
      description
    } = body;

    if (!sopResponseId || !evidenceType) {
      return NextResponse.json({ error: "sopResponseId and evidenceType are required" }, { status: 400 });
    }

    if (!['photo', 'text', 'file', 'recording'].includes(evidenceType)) {
      return NextResponse.json({ error: "evidenceType must be 'photo', 'text', 'file', or 'recording'" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const result = await query(`
      INSERT INTO "Evidence" (
        "sopResponseId", "alertId", "evidenceType", "fileUrl", "filePath",
        "fileName", "mimeType", "fileSize", "description", "uploadedBy"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      sopResponseId,
      alertId || null,
      evidenceType,
      fileUrl || null,
      filePath || null,
      fileName || null,
      mimeType || null,
      fileSize || null,
      description || null,
      userId
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create evidence:', error);
    return NextResponse.json({ error: "Failed to create evidence" }, { status: 500 });
  }
}

