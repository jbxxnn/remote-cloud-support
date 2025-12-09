import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { generateSOPRecommendations } from "@/lib/assistant/sop-recommender";
import { AssistantContextPayload } from "@/lib/assistant/types";

// GET /api/sop-responses/[id]/recommendations - Get recommendations for an SOP response
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: sopResponseId } = await params;

    // Fetch SOP response with related data
    const sopResponseResult = await query(
      `
      SELECT
        sr.*,
        s.name as "sopName",
        s.steps as "sopSteps",
        s."eventType",
        a.id as "alertId",
        a.status as "alertStatus",
        a.severity as "alertSeverity",
        a.type as "alertType",
        a.message as "alertMessage",
        a."createdAt" as "alertCreatedAt",
        c.id as "clientId",
        c.name as "clientName"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "Alert" a ON sr."alertId" = a.id
      LEFT JOIN "Client" c ON sr."clientId" = c.id
      WHERE sr.id = $1
    `,
      [sopResponseId]
    );

    if (sopResponseResult.rows.length === 0) {
      return NextResponse.json({ error: "SOP response not found" }, { status: 404 });
    }

    const row = sopResponseResult.rows[0];

    // Build context payload
    const context: AssistantContextPayload = {
      userRole: "staff",
      role: "staff",
      module: "sop_response",
      sop_response_id: sopResponseId,
      alert_id: row.alertId || undefined,
      client_id: row.clientId || undefined,
      timestamp: new Date().toISOString(),
      pageUrl: request.url,
      context: {
        sopResponse: {
          id: row.id,
          sopId: row.sopId,
          alertId: row.alertId,
          completedSteps: row.completedSteps || [],
          status: row.status,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
        },
        sop: {
          id: row.sopId,
          name: row.sopName,
          eventType: row.eventType,
          steps: row.sopSteps || [],
        },
        alert: row.alertId ? {
          id: row.alertId,
          status: row.alertStatus,
          severity: row.alertSeverity,
          type: row.alertType,
          message: row.alertMessage,
          createdAt: row.alertCreatedAt || new Date().toISOString(),
        } : undefined,
        client: row.clientId ? {
          id: row.clientId,
          name: row.clientName,
        } : undefined,
      },
    };

    // Generate recommendations
    const recommendations = await generateSOPRecommendations(context);

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

