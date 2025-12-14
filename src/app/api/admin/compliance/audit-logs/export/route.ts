import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import {
  generateCSVExport,
  generatePDFExport,
  formatAuditLogEntry,
  type AuditLogEntry,
} from "@/lib/export/audit-log-export";

/**
 * GET /api/admin/compliance/audit-logs/export - Export audit logs
 * 
 * Query params:
 * - format: Export format (csv, pdf)
 * - startDate: Start date for filtering (ISO string)
 * - endDate: End date for filtering (ISO string)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (format !== "csv" && format !== "pdf") {
      return NextResponse.json(
        { error: "Invalid format. Must be 'csv' or 'pdf'" },
        { status: 400 }
      );
    }

    // Build date filter
    let dateFilter = "";
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      dateFilter = `WHERE "createdAt" >= $${paramIndex} AND "createdAt" <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      dateFilter = `WHERE "createdAt" >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    } else if (endDate) {
      dateFilter = `WHERE "createdAt" <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Collect audit log data from various sources
    const auditLogs: AuditLogEntry[] = [];

    // 1. SOP Responses
    const sopResponsesResult = await query(
      `
      SELECT
        sr.id,
        sr."createdAt",
        sr."updatedAt",
        sr.status,
        sr."staffId",
        u.name as "staffName",
        s.name as "sopName",
        c.name as "clientName"
      FROM "SOPResponse" sr
      LEFT JOIN "User" u ON sr."staffId" = u.id
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "Client" c ON sr."clientId" = c.id
      ${dateFilter.replace(/"/g, 'sr."')}
      ORDER BY sr."createdAt" DESC
    `,
      params
    );

    sopResponsesResult.rows.forEach((row: any) => {
      auditLogs.push(
        formatAuditLogEntry({
          ...row,
          module: "SOP Response",
          action: row.status === "completed" ? "Completed SOP" : "Started SOP",
          entityType: "SOP Response",
          result: row.status === "completed" ? "success" : "warning",
          details: `SOP: ${row.sopName}, Client: ${row.clientName}`,
        })
      );
    });

    // 2. Incidents
    const incidentsResult = await query(
      `
      SELECT
        i.id,
        i."createdAt",
        i."updatedAt",
        i.status,
        i."incidentType",
        i."createdBy",
        i."reviewedBy",
        i."finalizedBy",
        u1.name as "createdByName",
        u2.name as "reviewedByName",
        u3.name as "finalizedByName",
        c.name as "clientName"
      FROM "Incident" i
      LEFT JOIN "User" u1 ON i."createdBy" = u1.id
      LEFT JOIN "User" u2 ON i."reviewedBy" = u2.id
      LEFT JOIN "User" u3 ON i."finalizedBy" = u3.id
      LEFT JOIN "Client" c ON i."clientId" = c.id
      ${dateFilter.replace(/"/g, 'i."')}
      ORDER BY i."createdAt" DESC
    `,
      params
    );

    incidentsResult.rows.forEach((row: any) => {
      // Creation log
      auditLogs.push(
        formatAuditLogEntry({
          ...row,
          id: `${row.id}-created`,
          timestamp: row.createdAt,
          userId: row.createdBy,
          userName: row.createdByName,
          module: "Incident",
          action: "Created Incident",
          entityType: row.incidentType,
          result: "success",
          details: `${row.incidentType} incident for ${row.clientName}`,
        })
      );

      // Review log
      if (row.reviewedBy) {
        auditLogs.push(
          formatAuditLogEntry({
            ...row,
            id: `${row.id}-reviewed`,
            timestamp: row.updatedAt,
            userId: row.reviewedBy,
            userName: row.reviewedByName,
            module: "Incident",
            action: "Reviewed Incident",
            entityType: row.incidentType,
            result: row.status === "finalized" || row.status === "locked" ? "success" : "warning",
            details: `Reviewed ${row.incidentType} incident`,
          })
        );
      }

      // Finalization log
      if (row.finalizedBy) {
        auditLogs.push(
          formatAuditLogEntry({
            ...row,
            id: `${row.id}-finalized`,
            timestamp: row.finalizedAt || row.updatedAt,
            userId: row.finalizedBy,
            userName: row.finalizedByName,
            module: "Incident",
            action: "Finalized Incident",
            entityType: row.incidentType,
            result: "success",
            details: `Finalized ${row.incidentType} incident`,
          })
        );
      }
    });

    // 3. Alert Events
    const alertEventsResult = await query(
      `
      SELECT
        ae.id,
        ae."createdAt",
        ae."eventType",
        ae."staffId",
        ae.message,
        u.name as "staffName",
        c.name as "clientName"
      FROM "AlertEvent" ae
      LEFT JOIN "User" u ON ae."staffId" = u.id
      LEFT JOIN "Client" c ON ae."clientId" = c.id
      ${dateFilter.replace(/"/g, 'ae."')}
      ORDER BY ae."createdAt" DESC
    `,
      params
    );

    alertEventsResult.rows.forEach((row: any) => {
      auditLogs.push(
        formatAuditLogEntry({
          ...row,
          module: "Alert",
          action: row.eventType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
          entityType: "Alert",
          result: row.eventType === "resolved" ? "success" : "warning",
          details: row.message || `Alert event: ${row.eventType}`,
        })
      );
    });

    // Sort by timestamp
    auditLogs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Generate export
    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

    if (format === "csv") {
      const csv = generateCSVExport(auditLogs);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      const pdf = generatePDFExport(auditLogs, {
        title: "Compliance Audit Log Export",
        dateRange,
      });
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error("Failed to export audit logs:", error);
    return NextResponse.json(
      {
        error: "Failed to export audit logs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



