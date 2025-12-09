import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fillAlertSummaryJSON } from "@/lib/assistant/json-filler";
import { AssistantContextPayload } from "@/lib/assistant/types";
import { query } from "@/lib/database";

// GET /api/alerts/[id]/export-json - Export alert as structured JSON
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: alertId } = await params;

    // Fetch alert and client data to build context
    const alertResult = await query(
      `
      SELECT
        a.*,
        c.id as "clientId",
        c.name as "clientName",
        c.email as "clientEmail",
        c.phone as "clientPhone"
      FROM "Alert" a
      LEFT JOIN "Client" c ON a."clientId" = c.id
      WHERE a.id = $1
    `,
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const alertData = alertResult.rows[0];

    // Build context payload
    const context: AssistantContextPayload = {
      userRole: (session.user as any).role || 'staff',
      role: (session.user as any).role || 'staff',
      module: 'alert',
      alert_id: alertId,
      client_id: alertData.clientId,
      timestamp: new Date().toISOString(),
      pageUrl: request.url,
      context: {
        alert: {
          id: alertData.id,
          type: alertData.type,
          status: alertData.status,
          message: alertData.message,
          severity: alertData.severity,
          createdAt: alertData.createdAt,
          updatedAt: alertData.updatedAt,
        },
        client: {
          id: alertData.clientId,
          name: alertData.clientName,
          email: alertData.clientEmail,
          phone: alertData.clientPhone,
        },
      },
    };

    // Generate JSON
    const jsonOutput = await fillAlertSummaryJSON(context);

    // Return as downloadable JSON file
    return NextResponse.json(jsonOutput.data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="alert-${alertId}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export alert JSON:", error);
    return NextResponse.json(
      { error: "Failed to export alert JSON" },
      { status: 500 }
    );
  }
}

