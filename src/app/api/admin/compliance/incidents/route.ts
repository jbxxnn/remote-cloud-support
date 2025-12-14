import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

/**
 * GET /api/admin/compliance/incidents - Get incidents for compliance overview
 * 
 * Query params:
 * - startDate: Start date for filtering (ISO string)
 * - endDate: End date for filtering (ISO string)
 * - status: Filter by status (draft, review, finalized, locked)
 * - incidentType: Filter by type (MUI, UI)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const incidentType = searchParams.get("incidentType");

    // Build query
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND i."createdAt" >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND i."createdAt" <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (incidentType) {
      whereClause += ` AND i."incidentType" = $${paramIndex}`;
      params.push(incidentType);
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

    // Calculate summary statistics
    const incidents = result.rows;
    const summary = {
      total: incidents.length,
      byStatus: {
        draft: incidents.filter((i: any) => i.status === "draft").length,
        review: incidents.filter((i: any) => i.status === "review").length,
        finalized: incidents.filter((i: any) => i.status === "finalized").length,
        locked: incidents.filter((i: any) => i.status === "locked").length,
      },
      byType: {
        MUI: incidents.filter((i: any) => i.incidentType === "MUI").length,
        UI: incidents.filter((i: any) => i.incidentType === "UI").length,
      },
      complianceRate: incidents.length > 0
        ? Math.round(
            ((incidents.filter((i: any) => 
              i.status === "finalized" || i.status === "locked"
            ).length) / incidents.length) * 100
          )
        : 100,
    };

    return NextResponse.json({
      incidents,
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch incidents",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



