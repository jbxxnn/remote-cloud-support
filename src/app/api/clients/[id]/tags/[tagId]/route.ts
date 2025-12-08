import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// DELETE /api/clients/[id]/tags/[tagId] - Delete a tag from a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id: clientId, tagId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify the tag belongs to this client
    const check = await query(`
      SELECT id FROM "ClientTag"
      WHERE id = $1 AND "clientId" = $2
    `, [tagId, clientId]);

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await query(`
      DELETE FROM "ClientTag"
      WHERE id = $1
    `, [tagId]);

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error('Failed to delete client tag:', error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

// PUT /api/clients/[id]/tags/[tagId] - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id: clientId, tagId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tag, tagType, color } = body;

    // Verify the tag belongs to this client
    const check = await query(`
      SELECT id FROM "ClientTag"
      WHERE id = $1 AND "clientId" = $2
    `, [tagId, clientId]);

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    if (tagType && !['risk', 'goal', 'custom'].includes(tagType)) {
      return NextResponse.json({ error: "tagType must be 'risk', 'goal', or 'custom'" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (tag !== undefined) {
      updates.push(`tag = $${paramIndex++}`);
      values.push(tag);
    }
    if (tagType !== undefined) {
      updates.push(`"tagType" = $${paramIndex++}`);
      values.push(tagType);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(tagId);

    const result = await query(`
      UPDATE "ClientTag"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update client tag:', error);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

