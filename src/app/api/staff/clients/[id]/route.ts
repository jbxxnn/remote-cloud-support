import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients/[id] - Get client details
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

    const result = await query(`
      SELECT 
        id, name, company, status, "emergencyContact", "emergencyServicesNumber"
      FROM "Client" 
      WHERE id = $1
    `, [clientId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = result.rows[0];
    
    // Format the response
    const clientData = {
      id: client.id,
      name: client.name,
      company: client.company,
      status: client.status,
      photo: undefined, // Not in schema yet
      emergencyServices: client.emergencyContact ? {
        name: client.emergencyContact,
        phone: client.emergencyServicesNumber,
        address: 'Contact for address' // Not in schema yet
      } : undefined
    };

    return NextResponse.json(clientData);
  } catch (error) {
    console.error('Failed to fetch client:', error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
} 