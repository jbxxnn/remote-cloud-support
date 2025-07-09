import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/admin/logs - Get all alert events with joined data
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await query(`
      SELECT 
        ae.*,
        c.name as "clientName",
        u.name as "staffName",
        a.type as "alertType",
        a.status as "alertStatus",
        a.message as "alertMessage"
      FROM "AlertEvent" ae
      LEFT JOIN "Client" c ON ae."clientId" = c.id
      LEFT JOIN "User" u ON ae."staffId" = u.id
      LEFT JOIN "Alert" a ON ae."alertId" = a.id
      ORDER BY ae."createdAt" DESC
    `);
    
    return NextResponse.json(events.rows);
  } catch (error) {
    console.error('Failed to fetch alert events:', error);
    return NextResponse.json({ error: "Failed to fetch alert events" }, { status: 500 });
  }
} 