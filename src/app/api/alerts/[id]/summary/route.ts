import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { getTagsForRecording, getTagsByType } from "@/lib/gemini/tag-generator";
import { getTranscript } from "@/lib/gemini/transcription-service";
import { analyzeTags } from "@/lib/assistant/tag-interpreter";
import { detectEscalation } from "@/lib/assistant/escalation-detector";

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

    // Fetch recordings linked to this alert
    const recordingsResult = await query(
      'SELECT id, "recordingType", "fileName", "createdAt" FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC',
      [alertId]
    );

    // Get tags and transcripts for recordings
    const recordingsWithData = await Promise.all(
      recordingsResult.rows.map(async (recording: any) => {
        const tags = await getTagsForRecording(recording.id);
        const transcript = await getTranscript(recording.id);
        const tagAnalysis = tags.length > 0 ? await analyzeTags(recording.id) : null;
        const escalationResult = await detectEscalation(alertId, recording.id);

        return {
          ...recording,
          tags,
          transcript: transcript ? {
            id: transcript.id,
            text: transcript.transcriptText,
            language: transcript.language,
            confidence: transcript.confidence,
          } : null,
          tagAnalysis,
          escalationResult,
        };
      })
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

    // Recordings with AI annotations
    if (recordingsWithData.length > 0) {
      summaryParts.push(`\nRECORDINGS & AI ANALYSIS:`);
      recordingsWithData.forEach((recording: any) => {
        summaryParts.push(`\nRecording: ${recording.fileName || recording.recordingType} (${new Date(recording.createdAt).toLocaleString()})`);
        
        // Tag analysis
        if (recording.tagAnalysis) {
          summaryParts.push(`  Risk Level: ${recording.tagAnalysis.riskLevel.toUpperCase()}`);
          summaryParts.push(`  Summary: ${recording.tagAnalysis.summary}`);
          
          // Highlight important tags
          const criticalTags = recording.tags.filter((t: any) => 
            t.tagType === 'risk_word' || 
            (t.tagType === 'tone' && ['agitated', 'distressed'].includes(t.tagValue)) ||
            (t.tagType === 'motion' && t.tagValue === 'fall')
          );
          
          if (criticalTags.length > 0) {
            summaryParts.push(`  ⚠️ Important Tags: ${criticalTags.map((t: any) => t.tagValue).join(', ')}`);
          }

          // Key insights
          if (recording.tagAnalysis.insights.length > 0) {
            const highSeverityInsights = recording.tagAnalysis.insights.filter((i: any) => 
              i.severity === 'high' || i.severity === 'critical'
            );
            if (highSeverityInsights.length > 0) {
              summaryParts.push(`  Key Insights:`);
              highSeverityInsights.forEach((insight: any) => {
                summaryParts.push(`    - ${insight.title}: ${insight.message}`);
              });
            }
          }
        }

        // Transcript excerpt
        if (recording.transcript) {
          const transcriptText = recording.transcript.text;
          // Get first 200 characters as excerpt
          const excerpt = transcriptText.length > 200 
            ? transcriptText.substring(0, 200) + '...'
            : transcriptText;
          summaryParts.push(`  Transcript Excerpt: "${excerpt}"`);
          summaryParts.push(`  (Confidence: ${(recording.transcript.confidence * 100).toFixed(0)}%)`);
        }

        // Escalation Detection
        if (recording.escalationResult && recording.escalationResult.shouldEscalate) {
          summaryParts.push(`  ⚠️ ESCALATION ALERT:`);
          summaryParts.push(`    Escalation Level: ${recording.escalationResult.escalationLevel.toUpperCase()}`);
          summaryParts.push(`    Escalation Score: ${recording.escalationResult.escalationScore}/100`);
          summaryParts.push(`    Recommended Action: ${recording.escalationResult.recommendedAction}`);
          if (recording.escalationResult.indicators.length > 0) {
            summaryParts.push(`    Key Indicators:`);
            recording.escalationResult.indicators
              .filter((i: any) => i.severity === 'critical' || i.severity === 'high')
              .slice(0, 3)
              .forEach((indicator: any) => {
                summaryParts.push(`      - ${indicator.type.toUpperCase()}: ${indicator.value}`);
              });
          }
        }
      });
    }

    const summary = summaryParts.join("\n");

    return NextResponse.json({
      alert,
      events: eventsResult.rows,
      sopResponses: sopResponsesResult.rows,
      recordings: recordingsWithData,
      summary,
    });
  } catch (error) {
    console.error("Failed to generate alert summary:", error);
    return NextResponse.json({ error: "Failed to generate alert summary" }, { status: 500 });
  }
}

