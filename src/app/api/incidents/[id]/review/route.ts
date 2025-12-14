import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

/**
 * POST /api/incidents/[id]/review - Update incident review status
 * 
 * Request body:
 * {
 *   status: 'draft' | 'review' | 'finalized' | 'locked',
 *   comment?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: incidentId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can review incidents
  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status, comment } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["draft", "review", "finalized", "locked"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if incident exists
    const incidentResult = await query(
      'SELECT * FROM "Incident" WHERE id = $1',
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const incident = incidentResult.rows[0];

    // Prevent editing locked incidents
    if (incident.status === "locked") {
      return NextResponse.json(
        { error: "Cannot modify locked incident" },
        { status: 403 }
      );
    }

    const userId = (session.user as any).id;
    const now = new Date();

    // Build update query based on status
    let updateQuery = '';
    let updateParams: any[] = [];
    let paramIndex = 1;

    if (status === "review") {
      // Moving to review - set reviewedBy
      updateQuery = `
        UPDATE "Incident"
        SET
          status = $${paramIndex++},
          "reviewedBy" = $${paramIndex++},
          "updatedAt" = $${paramIndex++}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;
      updateParams = [status, userId, now, incidentId];
    } else if (status === "finalized" || status === "locked") {
      // Finalizing - set finalizedBy and finalizedAt, copy draftData to finalizedData
      updateQuery = `
        UPDATE "Incident"
        SET
          status = $${paramIndex++},
          "finalizedBy" = $${paramIndex++},
          "finalizedAt" = $${paramIndex++},
          "finalizedData" = "draftData",
          "updatedAt" = $${paramIndex++}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;
      updateParams = [status, userId, now, now, incidentId];
    } else {
      // Returning to draft - clear review fields
      updateQuery = `
        UPDATE "Incident"
        SET
          status = $${paramIndex++},
          "reviewedBy" = NULL,
          "updatedAt" = $${paramIndex++}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;
      updateParams = [status, now, incidentId];
    }

    const result = await query(updateQuery, updateParams);

    // Store review comment if provided (could be stored in a separate table or in metadata)
    // For now, we'll add it to a review comments table if needed in the future

    return NextResponse.json({
      incident: result.rows[0],
      message: `Incident status updated to ${status}`,
    });
  } catch (error) {
    console.error("Failed to update incident review status:", error);
    return NextResponse.json(
      {
        error: "Failed to update incident review status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents/[id]/review - Get incident review details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: incidentId } = await params;

    const result = await query(
      `
      SELECT
        i.*,
        a.message as "alertMessage",
        c.name as "clientName",
        u1.name as "createdByName",
        u2.name as "reviewedByName",
        u3.name as "finalizedByName"
      FROM "Incident" i
      LEFT JOIN "Alert" a ON i."alertId" = a.id
      LEFT JOIN "Client" c ON i."clientId" = c.id
      LEFT JOIN "User" u1 ON i."createdBy" = u1.id
      LEFT JOIN "User" u2 ON i."reviewedBy" = u2.id
      LEFT JOIN "User" u3 ON i."finalizedBy" = u3.id
      WHERE i.id = $1
    `,
      [incidentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch incident review:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident review" },
      { status: 500 }
    );
  }
}

