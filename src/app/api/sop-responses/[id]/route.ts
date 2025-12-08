import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/sop-responses/[id] - Get single SOP response
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const result = await query(`
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
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "SOP response not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch SOP response:', error);
    return NextResponse.json({ error: "Failed to fetch SOP response" }, { status: 500 });
  }
}

// PUT /api/sop-responses/[id] - Update SOP response
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { completedSteps, notes, status, alertId } = body;

    // Get current response
    const currentResult = await query('SELECT * FROM "SOPResponse" WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: "SOP response not found" }, { status: 404 });
    }

    const current = currentResult.rows[0];
    const now = new Date();

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (completedSteps !== undefined) {
      updates.push(`"completedSteps" = $${paramIndex}`);
      values.push(JSON.stringify(completedSteps));
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;

      // If status is being set to completed, set completedAt
      if (status === 'completed' && !current.completedAt) {
        updates.push(`"completedAt" = $${paramIndex}`);
        values.push(now);
        paramIndex++;
      } else if (status !== 'completed' && current.completedAt) {
        // If status changed from completed, clear completedAt
        updates.push(`"completedAt" = NULL`);
      }
    }

    if (alertId !== undefined) {
      // If alertId is provided, verify it exists
      if (alertId) {
        const alertCheck = await query('SELECT id FROM "Alert" WHERE id = $1', [alertId]);
        if (alertCheck.rows.length === 0) {
          return NextResponse.json({ error: "Alert not found" }, { status: 404 });
        }
      }
      updates.push(`"alertId" = $${paramIndex}`);
      values.push(alertId || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`"updatedAt" = $${paramIndex}`);
    values.push(now);
    values.push(id);

    const result = await query(`
      UPDATE "SOPResponse"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `, values);

    // Get full response with related data
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
    `, [id]);

    return NextResponse.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Failed to update SOP response:', error);
    return NextResponse.json({ error: "Failed to update SOP response" }, { status: 500 });
  }
}

