import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/alerts/[id]/summary - Generate comprehensive alert summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: alertId } = await params;

    // Fetch alert with detection details
    const alertResult = await query(
      `
      SELECT 
        a.id,
        a."clientId",
        a.type,
        a.status,
        a.message,
        a."createdAt",
        a."updatedAt",
        a."assignedTo",
        d."detectionType",
        d.severity,
        d.location,
        d."clipUrl",
        d.confidence,
        d.timestamp as "detectionTimestamp",
        c.name as "clientName",
        u.name as "assignedToName"
      FROM "Alert" a
      LEFT JOIN "Detection" d ON a."detectionId" = d.id
      LEFT JOIN "Client" c ON a."clientId" = c.id
      LEFT JOIN "User" u ON a."assignedTo" = u.id
      WHERE a.id = $1
    `,
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const alert = alertResult.rows[0];

    // Fetch AlertEvents (activity timeline)
    const eventsResult = await query(
      `
      SELECT 
        ae.id,
        ae."eventType",
        ae.message,
        ae.metadata,
        ae."createdAt",
        u.name as "staffName"
      FROM "AlertEvent" ae
      LEFT JOIN "User" u ON ae."staffId" = u.id
      WHERE ae."alertId" = $1
      ORDER BY ae."createdAt" ASC
    `,
      [alertId]
    );

    // Fetch linked SOP responses
    const sopResponsesResult = await query(
      `
      SELECT 
        sr.id,
        sr.status,
        sr."startedAt",
        sr."completedAt",
        sr."completedSteps",
        s.name as "sopName",
        u.name as "staffName"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "User" u ON sr."staffId" = u.id
      WHERE sr."alertId" = $1
      ORDER BY sr."startedAt" DESC
    `,
      [alertId]
    );

    // Build summary text
    const summaryParts: string[] = [];

    // Alert header
    summaryParts.push(`ALERT SUMMARY: ${alert.message}`);
    summaryParts.push(`Status: ${alert.status.toUpperCase()}`);
    summaryParts.push(`Created: ${new Date(alert.createdAt).toLocaleString()}`);

    if (alert.assignedToName) {
      summaryParts.push(`Assigned to: ${alert.assignedToName}`);
    }

    // Detection details
    if (alert.detectionType) {
      summaryParts.push(`\nDETECTION DETAILS:`);
      summaryParts.push(`Type: ${alert.detectionType.replace(/_/g, " ")}`);
      if (alert.severity) {
        summaryParts.push(`Severity: ${alert.severity.toUpperCase()}`);
      }
      if (alert.location) {
        summaryParts.push(`Location: ${alert.location}`);
      }
      if (alert.confidence) {
        summaryParts.push(`Confidence: ${(alert.confidence * 100).toFixed(1)}%`);
      }
    }

    // Activity timeline
    if (eventsResult.rows.length > 0) {
      summaryParts.push(`\nACTIVITY TIMELINE:`);
      eventsResult.rows.forEach((event: any) => {
        const timestamp = new Date(event.createdAt).toLocaleString();
        const eventType = event.eventType.replace(/_/g, " ").toUpperCase();
        const staff = event.staffName || "Unknown";
        summaryParts.push(`[${timestamp}] ${eventType} by ${staff}`);
        if (event.message) {
          summaryParts.push(`  → ${event.message}`);
        }
        if (event.metadata) {
          try {
            const metadata = typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata;
            if (metadata.outcome) {
              summaryParts.push(`  → Outcome: ${metadata.outcome}`);
            }
          } catch (e) {
            // Ignore metadata parsing errors
          }
        }
      });
    }

    // SOP responses
    if (sopResponsesResult.rows.length > 0) {
      summaryParts.push(`\nSOP RESPONSES:`);
      sopResponsesResult.rows.forEach((sop: any) => {
        summaryParts.push(`- ${sop.sopName} (${sop.status})`);
        summaryParts.push(`  Started: ${new Date(sop.startedAt).toLocaleString()}`);
        if (sop.completedAt) {
          summaryParts.push(`  Completed: ${new Date(sop.completedAt).toLocaleString()}`);
        }
        if (sop.completedSteps && Array.isArray(sop.completedSteps)) {
          summaryParts.push(`  Steps completed: ${sop.completedSteps.length}`);
        }
        if (sop.staffName) {
          summaryParts.push(`  By: ${sop.staffName}`);
        }
      });
    }

    const summary = summaryParts.join("\n");

    return NextResponse.json({
      alert,
      events: eventsResult.rows,
      sopResponses: sopResponsesResult.rows,
      summary,
    });
  } catch (error) {
    console.error("Failed to generate alert summary:", error);
    return NextResponse.json({ error: "Failed to generate alert summary" }, { status: 500 });
  }
}

