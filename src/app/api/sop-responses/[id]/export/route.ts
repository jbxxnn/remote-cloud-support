import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";
import { generateSOPResponsePDF } from "@/lib/export/sop-response-pdf";

// GET /api/sop-responses/[id]/export - Export SOP response as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: sopResponseId } = await params;

    // Fetch SOP response with all related data
    const sopResponseResult = await query(`
      SELECT 
        sr.id,
        sr."sopId",
        sr."alertId",
        sr."clientId",
        sr."staffId",
        sr."completedSteps",
        sr."status",
        sr."startedAt",
        sr."completedAt",
        s.name as "sopName",
        s.steps as "sopSteps",
        c.name as "clientName",
        u.name as "staffName",
        a.message as "alertMessage"
      FROM "SOPResponse" sr
      JOIN "SOP" s ON sr."sopId" = s.id
      JOIN "Client" c ON sr."clientId" = c.id
      JOIN "User" u ON sr."staffId" = u.id
      LEFT JOIN "Alert" a ON sr."alertId" = a.id
      WHERE sr.id = $1
    `, [sopResponseId]);

    if (sopResponseResult.rows.length === 0) {
      return NextResponse.json({ error: "SOP response not found" }, { status: 404 });
    }

    const sopResponse = sopResponseResult.rows[0];

    // Fetch evidence
    const evidenceResult = await query(`
      SELECT id, "evidenceType", "fileName", "description", "createdAt"
      FROM "Evidence"
      WHERE "sopResponseId" = $1
      ORDER BY "createdAt" ASC
    `, [sopResponseId]);

    // Prepare data for PDF generation
    const pdfData = {
      id: sopResponse.id,
      sopName: sopResponse.sopName,
      clientName: sopResponse.clientName,
      staffName: sopResponse.staffName,
      status: sopResponse.status,
      startedAt: sopResponse.startedAt,
      completedAt: sopResponse.completedAt,
      steps: sopResponse.sopSteps || [],
      completedSteps: sopResponse.completedSteps || [],
      evidence: evidenceResult.rows,
      alertMessage: sopResponse.alertMessage || undefined,
    };

    // Generate PDF
    const pdf = generateSOPResponsePDF(pdfData);
    const pdfBlob = pdf.output('blob');

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sop-response-${sopResponseId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to export SOP response:', error);
    return NextResponse.json({ error: "Failed to export SOP response" }, { status: 500 });
  }
}

