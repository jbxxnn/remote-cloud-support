import { NextRequest, NextResponse } from "next/server";
import { pollForNewRecordings } from "@/lib/google-drive/polling-service";

/**
 * GET /api/cron/poll-drive - Vercel Cron endpoint for scheduled polling
 * 
 * This endpoint is called by Vercel Cron Jobs to poll Google Drive for new recordings.
 * Configure in vercel.json:
 * 
 * {
 *   "crons": [{
 *     "path": "/api/cron/poll-drive",
 *     "schedule": "*/5 * * * *"
 *   }]
 * }
 * 
 * Security: This endpoint should be protected by Vercel Cron's secret header
 * See: https://vercel.com/docs/cron-jobs#securing-cron-jobs
 */
export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel Cron request
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Also check for Vercel's cron header (if available)
  const cronHeader = request.headers.get('x-vercel-cron');
  if (!cronHeader && !cronSecret) {
    // In development, allow without auth, but warn
    console.warn('[Cron] Running without authentication (development mode)');
  }

  try {
    console.log(`[Cron] Starting scheduled polling at ${new Date().toISOString()}`);

    const stats = await pollForNewRecordings({
      intervalMinutes: 5,
      maxResults: 50,
      concurrency: 3,
      enableRateLimit: true,
      enableCircuitBreaker: true,
    });

    console.log(`[Cron] Polling completed: ${JSON.stringify(stats)}`);

    return NextResponse.json({
      success: true,
      ...stats,
      message: `Polling completed: checked ${stats.checked}, processed ${stats.processed}, errors ${stats.errors}, skipped ${stats.skipped}`,
    });
  } catch (error) {
    console.error('[Cron] Polling error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to poll for recordings",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

