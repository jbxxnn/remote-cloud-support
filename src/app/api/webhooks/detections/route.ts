import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function POST(request: NextRequest) {
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Webhook request received`);
  
  try {
    // Log request metadata
    console.log(`[${requestId}] Request URL: ${request.url}`);
    console.log(`[${requestId}] Request method: ${request.method}`);
    console.log(`[${requestId}] Headers:`, {
      'content-type': request.headers.get('content-type'),
      'authorization': request.headers.get('authorization') ? '***present***' : 'missing',
      'user-agent': request.headers.get('user-agent'),
    });

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`[${requestId}] Request body parsed successfully:`, JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 400 });
    }

    // Validate required fields
    console.log(`[${requestId}] Validating required fields...`);
    if (!body.device_id) {
      console.error(`[${requestId}] Missing required field: device_id`);
      return NextResponse.json({ 
        error: 'Missing required field: device_id',
        receivedFields: Object.keys(body)
      }, { status: 400 });
    }
    console.log(`[${requestId}] Required fields validated. device_id: ${body.device_id}`);

    // Validate API key
    const authHeader = request.headers.get('authorization');
    console.log(`[${requestId}] Authorization header:`, authHeader ? 'present' : 'missing');
    
    const apiKey = authHeader?.replace('Bearer ', '');
    if (!apiKey) {
      console.error(`[${requestId}] Missing API key in authorization header`);
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }
    console.log(`[${requestId}] API key extracted (length: ${apiKey.length})`);

    // Query client
    console.log(`[${requestId}] Querying client with API key...`);
    let clientResult;
    try {
      clientResult = await query(
        'SELECT * FROM "Client" WHERE "apiKey" = $1 AND "isActive" = true',
        [apiKey]
      );
      console.log(`[${requestId}] Client query completed. Found ${clientResult.rows.length} client(s)`);
    } catch (dbError) {
      console.error(`[${requestId}] Database error while querying client:`, dbError);
      throw dbError;
    }
    
    if (clientResult.rows.length === 0) {
      console.error(`[${requestId}] No active client found with provided API key`);
      return NextResponse.json({ error: 'Unauthorized - Invalid or inactive API key' }, { status: 401 });
    }
    
    const client = clientResult.rows[0];
    console.log(`[${requestId}] Client authenticated: ${client.id} (${client.name || 'unnamed'})`);
    
    // Find existing device (no auto-creation)
    console.log(`[${requestId}] Querying device with device_id: ${body.device_id}...`);
    let deviceResult;
    try {
      deviceResult = await query(
        'SELECT * FROM "Device" WHERE "deviceId" = $1',
        [body.device_id]
      );
      console.log(`[${requestId}] Device query completed. Found ${deviceResult.rows.length} device(s)`);
    } catch (dbError) {
      console.error(`[${requestId}] Database error while querying device:`, dbError);
      throw dbError;
    }
    
    if (deviceResult.rows.length === 0) {
      console.error(`[${requestId}] Device not found: ${body.device_id}`);
      return NextResponse.json({ 
        error: `Device not found: ${body.device_id}. Please create this device in the admin interface first.` 
      }, { status: 404 });
    }
    
    const device = deviceResult.rows[0];
    console.log(`[${requestId}] Device found: ${device.id} (deviceId: ${device.deviceId})`);
    
    // Store detection
    const now = new Date();
    
    // Parse timestamp safely
    let detectionTimestamp = now;
    if (body.ts) {
      try {
        const parsedTimestamp = new Date(body.ts);
        if (!isNaN(parsedTimestamp.getTime())) {
          detectionTimestamp = parsedTimestamp;
          console.log(`[${requestId}] Using provided timestamp: ${detectionTimestamp.toISOString()}`);
        } else {
          console.warn(`[${requestId}] Invalid timestamp format (NaN), using current time: ${body.ts}`);
        }
      } catch (error) {
        console.warn(`[${requestId}] Error parsing timestamp, using current time:`, body.ts, error);
      }
    } else {
      console.log(`[${requestId}] No timestamp provided, using current time: ${now.toISOString()}`);
    }

    // Prepare detection data
    const detectionData = {
      clientId: client.id,
      deviceId: device.id,
      detectionType: body.reason || 'fall_detected',
      confidence: body.confidence,
      clipUrl: body.image_topic || null,
      location: body.camera || body.device_id,
      severity: body.severity || 'high',
      timestamp: detectionTimestamp,
      createdAt: now,
      updatedAt: now
    };
    console.log(`[${requestId}] Inserting detection with data:`, JSON.stringify(detectionData, null, 2));

    let detectionResult;
    try {
      detectionResult = await query(`
        INSERT INTO "Detection" (id, "clientId", "deviceId", "detectionType", confidence, "clipUrl", location, severity, timestamp, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *
      `, [
        detectionData.clientId,
        detectionData.deviceId,
        detectionData.detectionType,
        detectionData.confidence,
        detectionData.clipUrl,
        detectionData.location,
        detectionData.severity,
        detectionData.timestamp,
        detectionData.createdAt
      ]);
      console.log(`[${requestId}] Detection inserted successfully. ID: ${detectionResult.rows[0]?.id}`);
    } catch (dbError) {
      console.error(`[${requestId}] Database error while inserting detection:`, dbError);
      throw dbError;
    }
    
    const detection = detectionResult.rows[0];
    
    // Trigger alerts based on severity
    console.log(`[${requestId}] Triggering alerts for severity: ${detection.severity}`);
    try {
      await triggerAlerts(detection, client, requestId);
      console.log(`[${requestId}] Alerts triggered successfully`);
    } catch (alertError) {
      console.error(`[${requestId}] Error triggering alerts:`, alertError);
      // Don't fail the whole request if alerts fail
    }
    
    console.log(`[${requestId}] Webhook processed successfully`);
    return NextResponse.json({ success: true, detectionId: detection.id });
  } catch (error) {
    console.error(`[${requestId}] Webhook error:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      requestId,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function triggerAlerts(detection: any, client: any, requestId?: string) {
  const logPrefix = requestId ? `[${requestId}]` : '[triggerAlerts]';
  console.log(`${logPrefix} Starting alert trigger for detection ${detection.id}, severity: ${detection.severity}`);
  
  const alertConfigs = {
    critical: ['email', 'webhook'],
    high: ['email'],
    medium: ['email'],
    low: []
  };
  
  const alertTypes = alertConfigs[detection.severity as keyof typeof alertConfigs] || [];
  console.log(`${logPrefix} Alert types for severity '${detection.severity}':`, alertTypes);
  
  if (alertTypes.length === 0) {
    console.log(`${logPrefix} No alerts to trigger for severity: ${detection.severity}`);
    return;
  }
  
  for (const alertType of alertTypes) {
    try {
      console.log(`${logPrefix} Creating ${alertType} alert...`);
      const now = new Date();
      const message = generateAlertMessage(detection, alertType);
      
      await query(`
        INSERT INTO "Alert" (id, "detectionId", "clientId", type, message, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $5)
      `, [
        detection.id,
        client.id,
        alertType,
        message,
        now
      ]);
      console.log(`${logPrefix} ${alertType} alert created successfully`);
    } catch (alertError) {
      console.error(`${logPrefix} Failed to create ${alertType} alert:`, alertError);
      throw alertError;
    }
  }
  
  console.log(`${logPrefix} All alerts triggered successfully`);
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