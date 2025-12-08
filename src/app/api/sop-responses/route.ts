import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/sop-responses - List all SOP responses (with filters)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const alertId = searchParams.get("alertId");
    const status = searchParams.get("status");
    const staffId = searchParams.get("staffId");

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      whereClause += ` AND sr."clientId" = $${paramIndex}`;
      queryParams.push(clientId);
      paramIndex++;
    }

    if (alertId) {
      whereClause += ` AND sr."alertId" = $${paramIndex}`;
      queryParams.push(alertId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (staffId) {
      whereClause += ` AND "staffId" = $${paramIndex}`;
      queryParams.push(staffId);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        sr.*,
        s.name as "sopName",
        s."eventType" as "sopEventType",
        c.name as "clientName",
        u.name as "staffName"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "Client" c ON sr."clientId" = c.id
      LEFT JOIN "User" u ON sr."staffId" = u.id
      ${whereClause}
      ORDER BY sr."startedAt" DESC
    `, queryParams);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch SOP responses:', error);
    return NextResponse.json({ error: "Failed to fetch SOP responses" }, { status: 500 });
  }
}

// POST /api/sop-responses - Create new SOP response
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sopId, alertId, clientId, staffId, notes } = body;

    // Validation
    if (!sopId || !clientId || !staffId) {
      return NextResponse.json({ 
        error: "sopId, clientId, and staffId are required" 
      }, { status: 400 });
    }

    // Verify SOP exists
    const sopCheck = await query('SELECT id, steps FROM "SOP" WHERE id = $1 AND "isActive" = true', [sopId]);
    if (sopCheck.rows.length === 0) {
      return NextResponse.json({ error: "SOP not found or inactive" }, { status: 404 });
    }

    // Verify client exists
    const clientCheck = await query('SELECT id FROM "Client" WHERE id = $1', [clientId]);
    if (clientCheck.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Verify staff user exists
    const staffCheck = await query('SELECT id FROM "User" WHERE id = $1 AND role = $2', [staffId, 'staff']);
    if (staffCheck.rows.length === 0) {
      return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
    }

    // If alertId provided, verify alert exists
    if (alertId) {
      const alertCheck = await query('SELECT id FROM "Alert" WHERE id = $1', [alertId]);
      if (alertCheck.rows.length === 0) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }
    }

    const now = new Date();

    // Create SOP response with empty completedSteps array
    const result = await query(`
      INSERT INTO "SOPResponse" (
        id, "sopId", "alertId", "clientId", "staffId", 
        "completedSteps", "notes", "status", 
        "startedAt", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, 
        '[]'::jsonb, $5, 'in_progress',
        $6, $6, $6
      )
      RETURNING *
    `, [sopId, alertId || null, clientId, staffId, notes || null, now]);

    const sopResponse = result.rows[0];

    // Get related data for response
    const fullResult = await query(`
      SELECT 
        sr.*,
        s.name as "sopName",
        s."eventType" as "sopEventType",
        s.steps as "sopSteps",
        c.name as "clientName",
        u.name as "staffName"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "Client" c ON sr."clientId" = c.id
      LEFT JOIN "User" u ON sr."staffId" = u.id
      WHERE sr.id = $1
    `, [sopResponse.id]);

    return NextResponse.json(fullResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create SOP response:', error);
    return NextResponse.json({ error: "Failed to create SOP response" }, { status: 500 });
  }
}

