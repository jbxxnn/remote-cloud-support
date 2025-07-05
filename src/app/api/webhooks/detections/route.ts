import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    // Validate API key
    const apiKey = authHeader?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { apiKey, isActive: true }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find or create device
    let device = await prisma.device.findFirst({
      where: {
        clientId: client.id,
        deviceId: body.data.device_id
      }
    });
    
    if (!device) {
      device = await prisma.device.create({
        data: {
          clientId: client.id,
          name: body.data.device_id,
          deviceId: body.data.device_id,
          location: body.data.location,
          deviceType: 'camera'
        }
      });
    }
    
    // Store detection
    const detection = await prisma.detection.create({
      data: {
        clientId: client.id,
        deviceId: device.id,
        detectionType: body.data.detection_type,
        confidence: body.data.confidence,
        clipUrl: body.data.clip_url,
        location: body.data.location,
        severity: body.data.severity || 'medium',
        timestamp: new Date(body.timestamp)
      }
    });
    
    // Trigger alerts based on severity
    await triggerAlerts(detection, client);
    
    return NextResponse.json({ success: true, detectionId: detection.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function triggerAlerts(detection: any, client: any) {
  const alertConfigs = {
    critical: ['email', 'webhook'],
    high: ['email'],
    medium: ['email'],
    low: []
  };
  
  const alertTypes = alertConfigs[detection.severity as keyof typeof alertConfigs] || [];
  
  for (const alertType of alertTypes) {
    await prisma.alert.create({
      data: {
        detectionId: detection.id,
        clientId: client.id,
        type: alertType,
        message: generateAlertMessage(detection, alertType)
      }
    });
  }
}

function generateAlertMessage(detection: any, alertType: string): string {
  const baseMessage = `Detection Alert: ${detection.detectionType} detected at ${detection.location} with ${Math.round(detection.confidence * 100)}% confidence.`;
  
  switch (alertType) {
    case 'email':
      return `${baseMessage} Severity: ${detection.severity}. Check dashboard for details.`;
    case 'webhook':
      return JSON.stringify({
        type: 'detection_alert',
        detection: detection,
        timestamp: new Date().toISOString()
      });
    default:
      return baseMessage;
  }
} 