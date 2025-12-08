import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/alerts/events - Get AlertEvents for specific alerts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const alertIdsParam = searchParams.get("alertIds");

    if (!alertIdsParam) {
      return NextResponse.json({ error: "alertIds parameter is required" }, { status: 400 });
    }

    const alertIds = alertIdsParam.split(",").filter((id) => id.trim());

    if (alertIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch AlertEvents with staff names
    const result = await query(
      `
      SELECT 
        ae.id,
        ae."alertId",
        ae."clientId",
        ae."staffId",
        ae."eventType",
        ae.message,
        ae.metadata,
        ae."createdAt",
        u.name as "staffName"
      FROM "AlertEvent" ae
      LEFT JOIN "User" u ON ae."staffId" = u.id
      WHERE ae."alertId" = ANY($1::text[])
      ORDER BY ae."createdAt" DESC
    `,
      [alertIds]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch alert events:", error);
    return NextResponse.json({ error: "Failed to fetch alert events" }, { status: 500 });
  }
}

