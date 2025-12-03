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
    
    // Normalize payload - handle both nested (data) and flat structures
    const payload = body.data || body;
    const deviceId = payload.device_id || body.device_id;
    const detectionType = payload.detection_type || payload.reason || body.reason || 'fall_detected';
    const confidence = payload.confidence || body.confidence;
    const clipUrl = payload.clip_url || payload.image_topic || body.image_topic || body.clip_url || null;
    const location = payload.location || body.location || payload.camera || body.camera || null;
    const severity = payload.severity || body.severity || 'high';
    const timestamp = body.timestamp || body.ts || Date.now();
    
    // Find or create device (optional - auto-create if not found)
    let device;
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device_id in payload' }, { status: 400 });
    }
    
    const deviceResult = await query(
      'SELECT * FROM "Device" WHERE "deviceId" = $1',
      [deviceId]
    );
    
    if (deviceResult.rows.length === 0) {
      // Auto-create device if it doesn't exist
      const deviceName = deviceId || 'Unknown Device';
      const deviceLocation = location || null;
      
      const newDeviceResult = await query(`
        INSERT INTO "Device" (id, "clientId", name, "deviceId", location, "deviceType", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, true, $6, $6)
        RETURNING *
      `, [
        client.id,
        deviceName,
        deviceId,
        deviceLocation,
        'camera', // default device type
        new Date()
      ]);
      
      device = newDeviceResult.rows[0];
      console.log(`Auto-created device: ${device.id} for device_id: ${deviceId}`);
    } else {
      device = deviceResult.rows[0];
    }
    
    // Store detection
    const now = new Date();
    
    // Parse timestamp safely
    let detectionTimestamp = now;
    if (timestamp) {
      try {
        // Handle both Unix timestamp (milliseconds) and ISO string
        const parsedTimestamp = typeof timestamp === 'number' 
          ? new Date(timestamp) 
          : new Date(timestamp);
        if (!isNaN(parsedTimestamp.getTime())) {
          detectionTimestamp = parsedTimestamp;
        }
      } catch (error) {
        console.warn('Invalid timestamp format, using current time:', timestamp);
      }
    }
    
    if (!confidence) {
      return NextResponse.json({ error: 'Missing confidence in payload' }, { status: 400 });
    }
    
    const detectionResult = await query(`
      INSERT INTO "Detection" (id, "clientId", "deviceId", "detectionType", confidence, "clipUrl", location, severity, timestamp, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *
    `, [
      client.id,
      device.id,
      detectionType,
      confidence,
      clipUrl,
      location,
      severity,
      detectionTimestamp,
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
      INSERT INTO "Alert" (id, "detectionId", "clientId", type, message, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $5)
    `, [
      detection.id,
      client.id,
      alertType,
      generateAlertMessage(detection, alertType),
      now
    ]);
  }
}

function generateAlertMessage(detection: any, alertType: string): string {
  const baseMessage = `Detection Alert: ${detection.detectionType} detected at ${detection.location} with ${Math.round(detection.confidence * 100)}% confidence.`;
  
  switch (alertType) {
    case 'email':
      // Removed severity from the message
      return `${baseMessage}`;
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