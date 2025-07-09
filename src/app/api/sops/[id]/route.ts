import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/sops/[id] - Get a specific SOP
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT 
        s.*,
        c.name as "clientName"
      FROM "SOP" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      WHERE s.id = $1
    `, [params.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "SOP not found" }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch SOP:', error);
    return NextResponse.json({ error: "Failed to fetch SOP" }, { status: 500 });
  }
}

// PUT /api/sops/[id] - Update a specific SOP
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      eventType, 
      description, 
      steps, 
      isGlobal, 
      clientId 
    } = body;

    if (!name || !eventType || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ 
        error: "Name, event type, and steps array are required" 
      }, { status: 400 });
    }

    // Validate steps structure
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.action || typeof step.action !== 'string') {
        return NextResponse.json({ 
          error: `Step ${i + 1} must have an 'action' field` 
        }, { status: 400 });
      }
    }

    const now = new Date();

    const result = await query(`
      UPDATE "SOP" 
      SET 
        name = $1, 
        "eventType" = $2, 
        description = $3, 
        steps = $4, 
        "isGlobal" = $5, 
        "clientId" = $6, 
        "updatedAt" = $7
      WHERE id = $8
      RETURNING *
    `, [
      name, eventType, description, JSON.stringify(steps), isGlobal, clientId, now, params.id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "SOP not found" }, { status: 404 });
    }

    const sop = result.rows[0];

    // Get client name if it's client-specific
    if (sop.clientId) {
      const clientResult = await query(
        'SELECT name FROM "Client" WHERE id = $1',
        [sop.clientId]
      );
      if (clientResult.rows.length > 0) {
        sop.clientName = clientResult.rows[0].name;
      }
    }

    return NextResponse.json(sop);
  } catch (error) {
    console.error('Failed to update SOP:', error);
    return NextResponse.json({ error: "Failed to update SOP" }, { status: 500 });
  }
}

// DELETE /api/sops/[id] - Delete a specific SOP
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if the SOP exists
    const checkResult = await query(
      'SELECT id FROM "SOP" WHERE id = $1',
      [params.id]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "SOP not found" }, { status: 404 });
    }

    // Delete the SOP
    await query(
      'DELETE FROM "SOP" WHERE id = $1',
      [params.id]
    );

    return NextResponse.json({ message: "SOP deleted successfully" });
  } catch (error) {
    console.error('Failed to delete SOP:', error);
    return NextResponse.json({ error: "Failed to delete SOP" }, { status: 500 });
  }
} 