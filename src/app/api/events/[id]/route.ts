import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/events/[id] - Get single event with linked SOP responses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get event
    const eventResult = await query(`
      SELECT 
        e.*,
        c.name as "clientName",
        u.name as "assignedToName"
      FROM "Event" e
      LEFT JOIN "Client" c ON e."clientId" = c.id
      LEFT JOIN "User" u ON e."assignedTo" = u.id
      WHERE e.id = $1
    `, [id]);

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Get linked SOP responses
    const sopResponsesResult = await query(`
      SELECT 
        sr.*,
        s.name as "sopName",
        u.name as "staffName"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "User" u ON sr."staffId" = u.id
      WHERE sr."eventId" = $1
      ORDER BY sr."startedAt" DESC
    `, [id]);

    return NextResponse.json({
      ...event,
      sopResponses: sopResponsesResult.rows
    });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

