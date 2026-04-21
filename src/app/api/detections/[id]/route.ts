import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, transaction } from "@/lib/database";
import { deleteDetectionRecords } from "@/lib/admin-record-delete";

// DELETE /api/detections/[id] - Admin delete detection and linked alerts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await query('SELECT id FROM "Detection" WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Detection not found" }, { status: 404 });
    }

    await transaction(async (client) => {
      await deleteDetectionRecords(client, id);
    });

    return NextResponse.json({ message: "Detection deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete detection:", error);
    console.error("Detection delete details:", {
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      message: error?.message,
    });
    return NextResponse.json({ error: "Failed to delete detection" }, { status: 500 });
  }
}
