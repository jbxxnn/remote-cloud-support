import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// GET /api/staff/clients - Get all clients with their current status for staff
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active clients with their device counts and alert status
    const clients = await query(`
      SELECT 
        c.id,
        c.name,
        c.company,
        c.email,
        c.phone,
        c.address,
        c."isActive",
        -- Count devices that have detections for this client (since devices are global)
        (SELECT COUNT(DISTINCT d.id) 
         FROM "Device" d 
         INNER JOIN "Detection" det ON d.id = det."deviceId"
         WHERE det."clientId" = c.id AND d."isActive" = true
        ) as "deviceCount",
        -- Get the latest alert for status determination
        MAX(a."createdAt") as "lastAlertTime",
        MAX(a.type) as "lastAlertType",
        MAX(a.message) as "lastAlertMessage",
        -- Check if client has any pending alerts
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM "Alert" a2 
            WHERE a2."clientId" = c.id 
            AND a2.status = 'pending'
          ) THEN true 
          ELSE false 
        END as "hasPendingAlerts",
        -- Check if client has any scheduled (acknowledged) alerts
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM "Alert" a2 
            WHERE a2."clientId" = c.id 
            AND a2.status = 'scheduled'
          ) THEN true 
          ELSE false 
        END as "hasScheduledAlerts",
        -- Get the most recent pending alert details
        (
          SELECT a3.type 
          FROM "Alert" a3 
          WHERE a3."clientId" = c.id 
          AND a3.status = 'pending' 
          ORDER BY a3."createdAt" DESC 
          LIMIT 1
        ) as "pendingAlertType",
        (
          SELECT a3.message 
          FROM "Alert" a3 
          WHERE a3."clientId" = c.id 
          AND a3.status = 'pending' 
          ORDER BY a3."createdAt" DESC 
          LIMIT 1
        ) as "pendingAlertMessage",
        (
          SELECT a3."createdAt" 
          FROM "Alert" a3 
          WHERE a3."clientId" = c.id 
          AND a3.status = 'pending' 
          ORDER BY a3."createdAt" DESC 
          LIMIT 1
        ) as "pendingAlertTime",
        -- Get the most recent scheduled alert details
        (
          SELECT a3.type 
          FROM "Alert" a3 
          WHERE a3."clientId" = c.id 
          AND a3.status = 'scheduled' 
          ORDER BY a3."createdAt" DESC 
          LIMIT 1
        ) as "scheduledAlertType",
        (
          SELECT a3.message 
          FROM "Alert" a3 
          WHERE a3."clientId" = c.id 
          AND a3.status = 'scheduled' 
          ORDER BY a3."createdAt" DESC 
          LIMIT 1
        ) as "scheduledAlertMessage",
        (
          SELECT a3."createdAt" 
          FROM "Alert" a3 
          WHERE a3."clientId" = c.id 
          AND a3.status = 'scheduled' 
          ORDER BY a3."createdAt" DESC 
          LIMIT 1
        ) as "scheduledAlertTime"
      FROM "Client" c
      LEFT JOIN "Alert" a ON c.id = a."clientId"
      WHERE c."isActive" = true
      GROUP BY c.id, c.name, c.company, c.email, c.phone, c.address, c."isActive"
      ORDER BY c.name
    `);

    // Transform the data to include status logic based on alerts
    const clientsWithStatus = clients.rows.map((client: any) => {
      let status: 'online' | 'scheduled' | 'alert' = 'online';
      let lastEvent = null;

      // Determine status based on alerts
      if (client.hasPendingAlerts) {
            status = 'alert';
            lastEvent = {
          type: client.pendingAlertType || 'alert',
          timestamp: client.pendingAlertTime,
          severity: 'high', // Pending alerts are considered high priority
          message: client.pendingAlertMessage
        };
      } else if (client.hasScheduledAlerts) {
        status = 'scheduled';
        lastEvent = {
          type: client.scheduledAlertType || 'scheduled_alert',
          timestamp: client.scheduledAlertTime,
          severity: 'medium', // Scheduled alerts are being handled
          message: client.scheduledAlertMessage
        };
      } else if (client.lastAlertTime) {
        // Client has had alerts but none pending or scheduled - check if recent
        const lastAlertTime = new Date(client.lastAlertTime);
        const hoursSinceAlert = (Date.now() - lastAlertTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceAlert < 24) {
          // Recent alert activity but resolved
          status = 'online';
          lastEvent = {
            type: client.lastAlertType || 'resolved_alert',
            timestamp: client.lastAlertTime,
          severity: 'medium'
        };
        }
      }

      // Get client tags (placeholder - will be implemented in Stage 2)
      // For now, return empty array
      const tags: any[] = [];

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        address: client.address,
        status,
        lastEvent,
        deviceCount: parseInt(client.deviceCount) || 0,
        isActive: client.isActive,
        tags
      };
    });

    return NextResponse.json(clientsWithStatus);
  } catch (error) {
    console.error('Failed to fetch clients for staff:', error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
} 