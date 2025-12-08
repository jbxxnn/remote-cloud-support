import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/evidence/[id] - Get a specific evidence record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const result = await query(`
      SELECT 
        e.*,
        u.name as "uploadedByName"
      FROM "Evidence" e
      LEFT JOIN "User" u ON e."uploadedBy" = u.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch evidence:', error);
    return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 });
  }
}

// DELETE /api/evidence/[id] - Delete evidence
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = (session.user as any).id;

    // Check if evidence exists and user has permission (uploaded by them or admin)
    const check = await query(`
      SELECT "uploadedBy" FROM "Evidence" WHERE id = $1
    `, [id]);

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
    }

    // Only allow deletion if user uploaded it or is admin
    if (check.rows[0].uploadedBy !== userId && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized to delete this evidence" }, { status: 403 });
    }

    await query(`
      DELETE FROM "Evidence" WHERE id = $1
    `, [id]);

    return NextResponse.json({ message: "Evidence deleted successfully" });
  } catch (error) {
    console.error('Failed to delete evidence:', error);
    return NextResponse.json({ error: "Failed to delete evidence" }, { status: 500 });
  }
}

