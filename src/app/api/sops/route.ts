import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/sops - Get all SOPs
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sops = await query(`
      SELECT 
        s.*,
        c.name as "clientName"
      FROM "SOP" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      ORDER BY s."isGlobal" DESC, s."eventType", s.name
    `);
    
    return NextResponse.json(sops.rows);
  } catch (error) {
    console.error('Failed to fetch SOPs:', error);
    return NextResponse.json({ error: "Failed to fetch SOPs" }, { status: 500 });
  }
}

// POST /api/sops - Create a new SOP
export async function POST(request: NextRequest) {
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
      INSERT INTO "SOP" (
        id, name, "eventType", description, steps, "isGlobal", "clientId", 
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING *
    `, [
      name, eventType, description, JSON.stringify(steps), isGlobal, clientId, now, now
    ]);

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

    return NextResponse.json(sop, { status: 201 });
  } catch (error) {
    console.error('Failed to create SOP:', error);
    return NextResponse.json({ error: "Failed to create SOP" }, { status: 500 });
  }
} 