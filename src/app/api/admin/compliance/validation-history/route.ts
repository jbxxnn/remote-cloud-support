import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

/**
 * GET /api/admin/compliance/validation-history - Get validation history
 * 
 * Query params:
 * - startDate: Start date for filtering (ISO string)
 * - endDate: End date for filtering (ISO string)
 * - validatorType: Filter by validator type (sop, record, compliance, billing)
 * - status: Filter by validation status (passed, failed)
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
    const validatorType = searchParams.get("validatorType");
    const status = searchParams.get("status");

    // Build date filter
    let dateFilter = "";
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      dateFilter = `WHERE sr."createdAt" >= $${paramIndex} AND sr."createdAt" <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      dateFilter = `WHERE sr."createdAt" >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    } else if (endDate) {
      dateFilter = `WHERE sr."createdAt" <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Get SOP responses with validation status
    const sopResponsesQuery = `
      SELECT
        sr.id,
        sr."sopId",
        sr."alertId",
        sr."clientId",
        sr.status,
        sr."completedSteps",
        sr."createdAt",
        sr."updatedAt",
        s.name as "sopName",
        s.steps as "sopSteps",
        c.name as "clientName",
        a.message as "alertMessage"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "Client" c ON sr."clientId" = c.id
      LEFT JOIN "Alert" a ON sr."alertId" = a.id
      ${dateFilter}
      ORDER BY sr."createdAt" DESC
      LIMIT 100
    `;

    const sopResponsesResult = await query(sopResponsesQuery, params);

    // Process SOP responses to extract validation information
    const validationHistory = [];

    for (const sopResponse of sopResponsesResult.rows) {
      // Determine validation status based on SOP response status
      const isValid = sopResponse.status === "completed";
      const completedSteps = sopResponse.completedSteps || [];
      const sopSteps = sopResponse.sopSteps || [];
      
      // Count errors and warnings (simplified - in real implementation, would run actual validation)
      const totalSteps = Array.isArray(sopSteps) ? sopSteps.length : 0;
      const completedCount = Array.isArray(completedSteps) ? completedSteps.length : 0;
      const missingSteps = totalSteps - completedCount;
      
      const errors: any[] = [];
      const warnings: any[] = [];

      if (missingSteps > 0) {
        errors.push({
          field: "completion",
          message: `${missingSteps} required step(s) not completed`,
          ruleRef: "OAC 5123.0412",
          severity: "error",
          blocking: true,
        });
      }

      // Check for missing notes in completed steps
      completedSteps.forEach((step: any, index: number) => {
        if (!step.notes || step.notes.trim().length === 0) {
          warnings.push({
            field: `step_${step.step || index + 1}`,
            message: `Step ${step.step || index + 1} missing notes`,
            ruleRef: "OAC 5123.0418",
            severity: "warning",
            blocking: false,
          });
        }
      });

      validationHistory.push({
        id: `sop-${sopResponse.id}`,
        type: "sop",
        validatorType: "sop",
        entityId: sopResponse.id,
        entityName: sopResponse.sopName || "Unknown SOP",
        clientId: sopResponse.clientId,
        clientName: sopResponse.clientName,
        alertId: sopResponse.alertId,
        alertMessage: sopResponse.alertMessage,
        isValid,
        errors: errors.length,
        warnings: warnings.length,
        errorDetails: errors,
        warningDetails: warnings,
        timestamp: sopResponse.createdAt,
        metadata: {
          completedSteps: completedCount,
          totalSteps,
        },
      });
    }

    // Get incidents with validation results
    const incidentsQuery = `
      SELECT
        i.id,
        i."alertId",
        i."clientId",
        i."incidentType",
        i.status,
        i."draftData",
        i."finalizedData",
        i."createdAt",
        c.name as "clientName",
        a.message as "alertMessage"
      FROM "Incident" i
      LEFT JOIN "Client" c ON i."clientId" = c.id
      LEFT JOIN "Alert" a ON i."alertId" = a.id
      ${dateFilter.replace(/sr\./g, "i.")}
      ORDER BY i."createdAt" DESC
      LIMIT 50
    `;

    const incidentsResult = await query(incidentsQuery, params);

    for (const incident of incidentsResult.rows) {
      const data = incident.finalizedData || incident.draftData || {};
      const validationResults = data.validationResults;

      if (validationResults) {
        validationHistory.push({
          id: `incident-${incident.id}`,
          type: "incident",
          validatorType: "compliance",
          entityId: incident.id,
          entityName: `${incident.incidentType} Incident`,
          clientId: incident.clientId,
          clientName: incident.clientName,
          alertId: incident.alertId,
          alertMessage: incident.alertMessage,
          isValid: validationResults.isValid,
          errors: validationResults.errors || 0,
          warnings: validationResults.warnings || 0,
          timestamp: incident.createdAt,
          metadata: {
            incidentType: incident.incidentType,
            status: incident.status,
          },
        });
      }
    }

    // Sort by timestamp
    validationHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply filters
    let filteredHistory = validationHistory;

    if (validatorType) {
      filteredHistory = filteredHistory.filter(
        (item) => item.validatorType === validatorType
      );
    }

    if (status) {
      if (status === "passed") {
        filteredHistory = filteredHistory.filter((item) => item.isValid);
      } else if (status === "failed") {
        filteredHistory = filteredHistory.filter((item) => !item.isValid);
      }
    }

    return NextResponse.json({
      history: filteredHistory,
      total: filteredHistory.length,
      summary: {
        total: filteredHistory.length,
        passed: filteredHistory.filter((item) => item.isValid).length,
        failed: filteredHistory.filter((item) => !item.isValid).length,
        byType: {
          sop: filteredHistory.filter((item) => item.type === "sop").length,
          incident: filteredHistory.filter((item) => item.type === "incident").length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch validation history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch validation history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



