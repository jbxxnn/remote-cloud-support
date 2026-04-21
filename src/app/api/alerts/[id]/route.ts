import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, transaction } from "@/lib/database";
import { deleteAlertRecords } from "@/lib/admin-record-delete";

// DELETE /api/alerts/[id] - Admin delete alert and linked records
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
    const existing = await query('SELECT id FROM "Alert" WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await transaction(async (client) => {
      await deleteAlertRecords(client, id);
    });

    return NextResponse.json({ message: "Alert deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete alert:", error);
    console.error("Alert delete details:", {
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      message: error?.message,
    });
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
