import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setupDriveWatch } from "@/lib/google-drive/watch-service";

/**
 * POST /api/google-drive/setup-watch - Set up Google Drive webhook/watch channel
 * 
 * This sets up push notifications for Google Drive file changes
 * Note: Watch channels expire after 7 days and need to be renewed
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { webhookUrl, folderId } = body;

    if (!webhookUrl) {
      return NextResponse.json({ 
        error: "webhookUrl is required",
        example: "https://your-domain.com/api/google-drive/webhook"
      }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json({ 
        error: "Invalid webhook URL format" 
      }, { status: 400 });
    }

    const channel = await setupDriveWatch(webhookUrl, folderId);

    return NextResponse.json({
      success: true,
      channel,
      message: `Watch channel created. Expires in ${Math.floor((channel.expiration - Date.now()) / (24 * 60 * 60 * 1000))} days.`,
      note: "Watch channels expire after 7 days and need to be renewed. Consider using polling instead for more reliability.",
    });
  } catch (error) {
    console.error('Failed to set up watch:', error);
    return NextResponse.json({ 
      error: "Failed to set up watch channel",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


