import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/clients - Get all clients
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: { 
          select: { 
            detections: true,
            devices: true,
            users: true
          } 
        },
        devices: {
          select: {
            id: true,
            name: true,
            deviceType: true,
            isActive: true,
            _count: { select: { detections: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, company, webhookUrl, notes } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        company,
        webhookUrl,
        notes,
        apiKey: generateApiKey(),
      },
      include: {
        _count: { 
          select: { 
            detections: true,
            devices: true,
            users: true
          } 
        }
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    console.error('Failed to create client:', error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

function generateApiKey(): string {
  // Generate a secure API key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 