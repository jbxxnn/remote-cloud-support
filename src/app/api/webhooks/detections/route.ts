import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook body:', JSON.stringify(body, null, 2));
    const authHeader = request.headers.get('authorization');
    
    // Validate API key
    const apiKey = authHeader?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const clientResult = await query(
      'SELECT * FROM "Client" WHERE "apiKey" = $1 AND "isActive" = true',
      [apiKey]
    );
    
    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const client = clientResult.rows[0];
    
    // Find or create device
    let deviceResult = await query(
      'SELECT * FROM "Device" WHERE "clientId" = $1 AND "deviceId" = $2',
      [client.id, body.data.device_id]
    );
    
    let device;
    if (deviceResult.rows.length === 0) {
      const now = new Date();
      const newDeviceResult = await query(`
        INSERT INTO "Device" ("clientId", name, "deviceId", location, "deviceType", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [client.id, body.data.device_id, body.data.device_id, body.data.location, 'camera', now, now]);
      device = newDeviceResult.rows[0];
    } else {
      device = deviceResult.rows[0];
    }
    
    // Store detection
    const now = new Date();
    
    // Parse timestamp safely
    let detectionTimestamp = now;
    if (body.timestamp) {
      try {
        const parsedTimestamp = new Date(body.timestamp);
        if (!isNaN(parsedTimestamp.getTime())) {
          detectionTimestamp = parsedTimestamp;
        }
      } catch (error) {
        console.warn('Invalid timestamp format, using current time:', body.timestamp);
      }
    }
    
    const detectionResult = await query(`
      INSERT INTO "Detection" ("clientId", "deviceId", "detectionType", confidence, "clipUrl", location, severity, timestamp, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      client.id,
      device.id,
      body.data.detection_type,
      body.data.confidence,
      body.data.clip_url,
      body.data.location,
      body.data.severity || 'medium',
      detectionTimestamp,
      now,
      now
    ]);
    
    const detection = detectionResult.rows[0];
    
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
    const now = new Date();
    await query(`
      INSERT INTO "Alert" ("detectionId", "clientId", type, message, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      detection.id,
      client.id,
      alertType,
      generateAlertMessage(detection, alertType),
      now,
      now
    ]);
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