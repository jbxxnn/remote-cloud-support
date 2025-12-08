import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/events - List events (with filters)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      whereClause += ` AND e."clientId" = $${paramIndex}`;
      queryParams.push(clientId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND e.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      whereClause += ` AND e."assignedTo" = $${paramIndex}`;
      queryParams.push(assignedTo);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        e.*,
        c.name as "clientName",
        u.name as "assignedToName"
      FROM "Event" e
      LEFT JOIN "Client" c ON e."clientId" = c.id
      LEFT JOIN "User" u ON e."assignedTo" = u.id
      ${whereClause}
      ORDER BY e.timestamp DESC
    `, queryParams);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

