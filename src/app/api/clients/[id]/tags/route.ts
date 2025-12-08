import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/clients/[id]/tags - Get all tags for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT id, tag, "tagType", color, "createdAt"
      FROM "ClientTag"
      WHERE "clientId" = $1
      ORDER BY "tagType", tag
    `, [clientId]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch client tags:', error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST /api/clients/[id]/tags - Add a tag to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tag, tagType, color } = body;

    if (!tag || !tagType) {
      return NextResponse.json({ error: "Tag and tagType are required" }, { status: 400 });
    }

    if (!['risk', 'goal', 'custom'].includes(tagType)) {
      return NextResponse.json({ error: "tagType must be 'risk', 'goal', or 'custom'" }, { status: 400 });
    }

    // Check if tag already exists for this client
    const existing = await query(`
      SELECT id FROM "ClientTag"
      WHERE "clientId" = $1 AND tag = $2 AND "tagType" = $3
    `, [clientId, tag, tagType]);

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Tag already exists for this client" }, { status: 400 });
    }

    // Set default color based on tagType if not provided
    let tagColor = color;
    if (!tagColor) {
      switch (tagType) {
        case 'risk':
          tagColor = '#ef4444'; // red
          break;
        case 'goal':
          tagColor = '#3b82f6'; // blue
          break;
        case 'custom':
          tagColor = '#6b7280'; // gray
          break;
      }
    }

    const result = await query(`
      INSERT INTO "ClientTag" ("clientId", tag, "tagType", color)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [clientId, tag, tagType, tagColor]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create client tag:', error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

