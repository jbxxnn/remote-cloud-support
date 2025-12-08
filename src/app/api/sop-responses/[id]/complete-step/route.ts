import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// PATCH /api/sop-responses/[id]/complete-step - Mark step as complete
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { stepNumber, notes, action } = body;

    if (stepNumber === undefined) {
      return NextResponse.json({ error: "stepNumber is required" }, { status: 400 });
    }

    // Get current response and SOP
    const currentResult = await query(`
      SELECT sr.*, s.steps as "sopSteps"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      WHERE sr.id = $1
    `, [id]);

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: "SOP response not found" }, { status: 404 });
    }

    const current = currentResult.rows[0];
    const sopSteps = current.sopSteps || [];
    const completedSteps = current.completedSteps || [];

    // Validate step number
    if (stepNumber < 1 || stepNumber > sopSteps.length) {
      return NextResponse.json({ 
        error: `Step number must be between 1 and ${sopSteps.length}` 
      }, { status: 400 });
    }

    // Get step details from SOP
    const stepIndex = stepNumber - 1;
    const stepData = sopSteps[stepIndex];
    
    // Extract step action text
    let stepAction = '';
    if (typeof stepData === 'string') {
      stepAction = stepData;
    } else if (typeof stepData === 'object' && stepData.action) {
      stepAction = stepData.action;
    } else if (typeof stepData === 'object') {
      stepAction = stepData.step || stepData.description || stepData.text || stepData.content || `Step ${stepNumber}`;
    } else {
      stepAction = `Step ${stepNumber}`;
    }

    // Use provided action if given, otherwise use from SOP
    const finalAction = action || stepAction;

    // Check if step is already completed
    const existingStepIndex = completedSteps.findIndex(
      (s: any) => s.step === stepNumber
    );

    const stepCompletion = {
      step: stepNumber,
      action: finalAction,
      completedAt: new Date().toISOString(),
      notes: notes || null
    };

    let updatedCompletedSteps;
    if (existingStepIndex >= 0) {
      // Update existing step completion
      updatedCompletedSteps = [...completedSteps];
      updatedCompletedSteps[existingStepIndex] = stepCompletion;
    } else {
      // Add new step completion
      updatedCompletedSteps = [...completedSteps, stepCompletion];
    }

    // Sort by step number
    updatedCompletedSteps.sort((a: any, b: any) => a.step - b.step);

    const now = new Date();

    // Update the response
    await query(`
      UPDATE "SOPResponse"
      SET 
        "completedSteps" = $1,
        "updatedAt" = $2
      WHERE id = $3
    `, [JSON.stringify(updatedCompletedSteps), now, id]);

    // Get updated response with related data
    const fullResult = await query(`
      SELECT 
        sr.*,
        s.name as "sopName",
        s."eventType" as "sopEventType",
        s.steps as "sopSteps",
        c.name as "clientName",
        u.name as "staffName"
      FROM "SOPResponse" sr
      LEFT JOIN "SOP" s ON sr."sopId" = s.id
      LEFT JOIN "Client" c ON sr."clientId" = c.id
      LEFT JOIN "User" u ON sr."staffId" = u.id
      WHERE sr.id = $1
    `, [id]);

    return NextResponse.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Failed to complete step:', error);
    return NextResponse.json({ error: "Failed to complete step" }, { status: 500 });
  }
}

