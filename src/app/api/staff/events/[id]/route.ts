import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/database";

// PATCH /api/staff/events/[id] - Perform actions on events
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, notes, outcome } = body;
    const eventId = params.id;
    const currentUserId = (session.user as any).id;
    const now = new Date();

    switch (action) {
      case 'claim':
        // Assign the event to the current staff member
        await query(`
          UPDATE "Event" 
          SET 
            status = 'assigned',
            "assignedTo" = $1,
            "updatedAt" = $2
          WHERE id = $3 AND status = 'pending'
        `, [currentUserId, now, eventId]);
        break;

      case 'resolve':
        // Mark the event as resolved
        await query(`
          UPDATE "Event" 
          SET 
            status = 'resolved',
            "resolvedAt" = $1,
            "updatedAt" = $2
          WHERE id = $3 AND ("assignedTo" = $4 OR "assignedTo" IS NULL)
        `, [now, now, eventId, currentUserId]);
        break;

      case 'acknowledge':
        // Mark the event as acknowledged
        await query(`
          UPDATE "Event" 
          SET 
            "acknowledgedAt" = $1,
            "updatedAt" = $2
          WHERE id = $3
        `, [now, now, eventId]);
        
        // Log the acknowledge action
        await query(`
          INSERT INTO "EventAction" (
            id, "eventId", "staffId", action, "createdAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, 'acknowledge', $3
          )
        `, [eventId, currentUserId, now]);
        break;

      case 'call':
        // Log a call action (this could trigger Google Meet integration)
        await query(`
          INSERT INTO "EventAction" (
            id, "eventId", "staffId", action, "createdAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, 'call', $3
          )
        `, [eventId, currentUserId, now]);
        break;

      case 'resolve':
        // Mark the event as resolved
        await query(`
          UPDATE "Event" 
          SET 
            status = 'resolved',
            "resolvedAt" = $1,
            "updatedAt" = $2
          WHERE id = $3 AND ("assignedTo" = $4 OR "assignedTo" IS NULL)
        `, [now, now, eventId, currentUserId]);
        
        // Log the resolve action with notes
        await query(`
          INSERT INTO "EventAction" (
            id, "eventId", "staffId", action, details, "createdAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, 'resolve', $3, $4
          )
        `, [eventId, currentUserId, JSON.stringify({ notes, outcome }), now]);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to perform event action:', error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
} 