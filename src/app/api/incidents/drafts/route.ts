import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { generateMUIDraft, DraftOptions } from "@/lib/incidents/mui-drafter";

/**
 * POST /api/incidents/drafts - Create MUI/UI incident draft
 * 
 * Request body:
 * {
 *   alertId: string,
 *   options?: {
 *     includeAIAnalysis?: boolean,
 *     includeValidation?: boolean,
 *     includeTimeline?: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { alertId, options } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 }
      );
    }

    // Generate draft
    const draftData = await generateMUIDraft(alertId, options || {});

    // Check if draft already exists for this alert
    const existingDraft = await query(
      'SELECT id FROM "Incident" WHERE "alertId" = $1 AND status = $2 LIMIT 1',
      [alertId, 'draft']
    );

    const userId = (session.user as any).id;
    const now = new Date();

    let incidentId: string;

    if (existingDraft.rows.length > 0) {
      // Update existing draft
      const updateResult = await query(
        `
        UPDATE "Incident"
        SET
          "draftData" = $1,
          "incidentType" = $2,
          "updatedAt" = $3
        WHERE id = $4
        RETURNING id
      `,
        [
          JSON.stringify(draftData),
          draftData.incidentType,
          now,
          existingDraft.rows[0].id,
        ]
      );
      incidentId = updateResult.rows[0].id;
    } else {
      // Create new draft
      const insertResult = await query(
        `
        INSERT INTO "Incident" (
          id, "alertId", "clientId", "incidentType", status, "draftData", "createdBy", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $7
        )
        RETURNING id
      `,
        [
          alertId,
          draftData.client.id,
          draftData.incidentType,
          'draft',
          JSON.stringify(draftData),
          userId,
          now,
        ]
      );
      incidentId = insertResult.rows[0].id;
    }

    // Fetch the created/updated incident
    const incidentResult = await query(
      'SELECT * FROM "Incident" WHERE id = $1',
      [incidentId]
    );

    return NextResponse.json({
      incident: incidentResult.rows[0],
      draftData,
      message: existingDraft.rows.length > 0
        ? 'Draft updated successfully'
        : 'Draft created successfully',
    }, { status: existingDraft.rows.length > 0 ? 200 : 201 });
  } catch (error) {
    console.error("Failed to create incident draft:", error);
    return NextResponse.json(
      {
        error: "Failed to create incident draft",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents/drafts - Get incident drafts
 * 
 * Query params:
 * - alertId: Filter by alert ID
 * - clientId: Filter by client ID
 * - status: Filter by status (draft, review, finalized, locked)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (alertId) {
      whereClause += ` AND "alertId" = $${paramIndex}`;
      params.push(alertId);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND "clientId" = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

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
      ${whereClause}
      ORDER BY i."createdAt" DESC
    `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch incident drafts:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident drafts" },
      { status: 500 }
    );
  }
}



