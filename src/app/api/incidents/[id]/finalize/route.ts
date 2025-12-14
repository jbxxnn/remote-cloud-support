import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { finalizeIncident, lockIncident, verifyIncidentIntegrity } from "@/lib/incidents/incident-finalizer";

/**
 * POST /api/incidents/[id]/finalize - Finalize an incident
 * 
 * Request body (optional):
 * {
 *   lock?: boolean  // If true, also lock the incident after finalization
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can finalize incidents
  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: incidentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { lock } = body;

    const userId = (session.user as any).id;

    // Finalize the incident
    const result = await finalizeIncident(incidentId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to finalize incident" },
        { status: 400 }
      );
    }

    // Lock if requested
    if (lock) {
      const lockResult = await lockIncident(incidentId, userId);
      if (!lockResult.success) {
        // Log warning but don't fail the request
        console.warn(`Failed to lock incident ${incidentId}:`, lockResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      packet: result.packet,
      message: lock
        ? "Incident finalized and locked successfully"
        : "Incident finalized successfully",
    });
  } catch (error) {
    console.error("Failed to finalize incident:", error);
    return NextResponse.json(
      {
        error: "Failed to finalize incident",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incidents/[id]/finalize/lock - Lock a finalized incident
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can lock incidents
  if ((session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: incidentId } = await params;
    const userId = (session.user as any).id;

    const result = await lockIncident(incidentId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to lock incident" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Incident locked successfully",
    });
  } catch (error) {
    console.error("Failed to lock incident:", error);
    return NextResponse.json(
      {
        error: "Failed to lock incident",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents/[id]/finalize/verify - Verify integrity of finalized incident
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: incidentId } = await params;

    const result = await verifyIncidentIntegrity(incidentId);

    return NextResponse.json({
      valid: result.valid,
      error: result.error,
    });
  } catch (error) {
    console.error("Failed to verify incident integrity:", error);
    return NextResponse.json(
      {
        error: "Failed to verify incident integrity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



