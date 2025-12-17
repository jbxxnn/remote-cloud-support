import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pollForNewRecordings, getPollingHealth } from "@/lib/google-drive/polling-service";

/**
 * POST /api/google-drive/poll - Manually trigger polling for new recordings
 * 
 * This endpoint allows manual polling for development when webhooks aren't available
 * In production, use Vercel Cron or webhooks instead.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { 
      intervalMinutes, 
      maxResults, 
      concurrency,
      enableRateLimit = true,
      enableCircuitBreaker = true,
    } = body;

    const stats = await pollForNewRecordings({
      intervalMinutes: intervalMinutes || 5,
      maxResults: maxResults || 50,
      concurrency: concurrency || 3,
      enableRateLimit,
      enableCircuitBreaker,
    });

    return NextResponse.json({
      success: true,
      ...stats,
      message: `Checked ${stats.checked} recordings, processed ${stats.processed}, errors: ${stats.errors}, skipped: ${stats.skipped}, duration: ${stats.duration}ms`,
    });
  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json({
      error: "Failed to poll for recordings",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/google-drive/poll - Get polling status and health
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const health = getPollingHealth();

  return NextResponse.json({
    message: "Polling service status",
    endpoint: "/api/google-drive/poll",
    method: "POST",
    health,
    usage: {
      trigger: "POST /api/google-drive/poll",
      cron: "GET /api/cron/poll-drive (Vercel Cron)",
    },
  });
}

