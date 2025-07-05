import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/devices - Get all devices
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    const devices = await prisma.device.findMany({
      where: clientId ? { clientId } : {},
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true
          }
        },
        _count: { 
          select: { detections: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

// POST /api/devices - Create a new device
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, name, deviceId, location, deviceType, metadata } = body;

    if (!clientId || !name || !deviceId) {
      return NextResponse.json({ error: "Client ID, name, and device ID are required" }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: {
        clientId,
        name,
        deviceId,
        location,
        deviceType: deviceType || 'camera',
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      }
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Device ID already exists for this client" }, { status: 400 });
    }
    console.error('Failed to create device:', error);
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
} 