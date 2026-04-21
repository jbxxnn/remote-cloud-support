import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

async function getDetectionSopSelect() {
  const result = await query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Detection'
        AND column_name = 'sopId'
    ) as "hasSopId"
  `);

  return result.rows[0]?.hasSopId ? 'd."sopId"' : 'NULL::text as "sopId"';
}

// GET /api/alerts - Admin alert listing
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);

    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      whereConditions.push(`a."clientId" = $${paramIndex}`);
      params.push(clientId);
      paramIndex++;
    }

    if (status && status !== "all") {
      const statuses = status.includes(",") ? status.split(",") : [status];
      whereConditions.push(`a.status = ANY($${paramIndex}::text[])`);
      params.push(statuses);
      paramIndex++;
    }

    if (severity && severity !== "all") {
      whereConditions.push(`d.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const sopIdSelect = await getDetectionSopSelect();

    const alerts = await query(
      `
      SELECT
        a.id,
        a.type,
        a.status,
        a.message,
        a."sentAt",
        a."createdAt",
        a."clientId",
        a."detectionId",
        c.name as "clientName",
        c.company as "clientCompany",
        d.location,
        d."clipUrl",
        d.severity,
        d."detectionType",
        ${sopIdSelect}
      FROM "Alert" a
      LEFT JOIN "Client" c ON a."clientId" = c.id
      LEFT JOIN "Detection" d ON a."detectionId" = d.id
      ${whereClause}
      ORDER BY a."createdAt" DESC
      LIMIT $${paramIndex}
    `,
      [...params, limit]
    );

    return NextResponse.json(alerts.rows);
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
