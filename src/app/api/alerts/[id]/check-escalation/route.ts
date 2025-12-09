import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { detectEscalation, getEscalationSummary } from "@/lib/assistant/escalation-detector";

// GET /api/alerts/[id]/check-escalation - Check if alert requires escalation
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

    // Fetch alert and check if it has a recording
    const alertResult = await query(
      'SELECT id, "clientId", status, severity FROM "Alert" WHERE id = $1',
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const alert = alertResult.rows[0];

    // Find recording associated with this alert
    const recordingResult = await query(
      'SELECT id FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [alertId]
    );

    const recordingId = recordingResult.rows.length > 0 ? recordingResult.rows[0].id : undefined;

    // Detect escalation
    const escalationResult = await detectEscalation(alertId, recordingId);

    // If escalation is recommended, create an AlertEvent
    if (escalationResult.shouldEscalate) {
      const userId = (session.user as any).id;
      const now = new Date();

      // Check if escalation event already exists for this alert
      const existingEvent = await query(
        'SELECT id FROM "AlertEvent" WHERE "alertId" = $1 AND "eventType" = $2 ORDER BY "createdAt" DESC LIMIT 1',
        [alertId, 'escalation_detected']
      );

      if (existingEvent.rows.length === 0) {
        // Create escalation event
        await query(
          `
          INSERT INTO "AlertEvent" (
            id, "alertId", "clientId", "staffId", "eventType", "message", "metadata", "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $7
          )
        `,
          [
            alertId,
            alert.clientId,
            userId,
            'escalation_detected',
            `Escalation detected: ${escalationResult.escalationLevel.toUpperCase()} - ${escalationResult.recommendedAction}`,
            JSON.stringify({
              escalationScore: escalationResult.escalationScore,
              escalationLevel: escalationResult.escalationLevel,
              urgency: escalationResult.urgency,
              indicators: escalationResult.indicators,
              reasons: escalationResult.reasons,
            }),
            now,
          ]
        );
      }
    }

    return NextResponse.json({
      ...escalationResult,
      summary: getEscalationSummary(escalationResult),
      alertId,
      recordingId,
    });
  } catch (error) {
    console.error("Failed to check escalation:", error);
    return NextResponse.json(
      { error: "Failed to check escalation" },
      { status: 500 }
    );
  }
}

