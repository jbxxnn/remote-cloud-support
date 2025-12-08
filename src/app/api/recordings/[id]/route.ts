import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/recordings/[id] - Get a specific recording
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
        r.*,
        u.name as "recordedByName"
      FROM "Recording" r
      LEFT JOIN "User" u ON r."recordedBy" = u.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch recording:', error);
    return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
  }
}

// DELETE /api/recordings/[id] - Delete recording
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

    // Check if recording exists and user has permission
    const check = await query(`
      SELECT "recordedBy" FROM "Recording" WHERE id = $1
    `, [id]);

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Only allow deletion if user recorded it or is admin
    if (check.rows[0].recordedBy !== userId && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized to delete this recording" }, { status: 403 });
    }

    await query(`
      DELETE FROM "Recording" WHERE id = $1
    `, [id]);

    return NextResponse.json({ message: "Recording deleted successfully" });
  } catch (error) {
    console.error('Failed to delete recording:', error);
    return NextResponse.json({ error: "Failed to delete recording" }, { status: 500 });
  }
}

