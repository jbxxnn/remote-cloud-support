import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/sops - Get client SOPs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const detectionType = searchParams.get('detectionType'); // Filter by detection type

    console.log('[SOPS API] Client ID:', clientId);
    console.log('[SOPS API] Detection Type:', detectionType);

    let whereClause = 'WHERE ("clientId" = $1 OR "isGlobal" = true) AND "isActive" = true';
    let queryParams = [clientId];

    if (detectionType) {
      whereClause += ' AND LOWER("eventType") = LOWER($2)';
      queryParams.push(detectionType);
    }

    console.log('[SOPS API] SQL Query:', whereClause);
    console.log('[SOPS API] Query Params:', queryParams);

    const result = await query(`
      SELECT 
        id,
        name,
        description,
        "eventType",
        steps,
        "isGlobal",
        "clientId"
      FROM "SOP"
      ${whereClause}
      ORDER BY "isGlobal" DESC, name ASC
    `, queryParams);

    console.log('[SOPS API] SOPs found:', result.rows.length);
    console.log('[SOPS API] SOPs:', result.rows);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch client SOPs:', error);
    return NextResponse.json({ error: "Failed to fetch client SOPs" }, { status: 500 });
  }
} 