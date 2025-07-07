import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id]/sops - Get SOPs for a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clientId = params.id;

    // Get SOPs for this client (both client-specific and global)
    const sops = await query(`
      SELECT 
        s.id,
        s.name,
        s."eventType",
        s.description,
        s.steps,
        s."isGlobal"
      FROM "SOP" s
      WHERE (s."clientId" = $1 OR s."isGlobal" = true)
        AND s."isActive" = true
      ORDER BY s."isGlobal" ASC, s.name ASC
    `, [clientId]);

    // Transform the data
    const transformedSops = sops.rows.map((sop: any) => ({
      id: sop.id,
      name: sop.name,
      eventType: sop.eventType,
      description: sop.description,
      steps: sop.steps,
      isGlobal: sop.isGlobal
    }));

    return NextResponse.json(transformedSops);
  } catch (error) {
    console.error('Failed to fetch client SOPs:', error);
    return NextResponse.json({ error: "Failed to fetch client SOPs" }, { status: 500 });
  }
} 