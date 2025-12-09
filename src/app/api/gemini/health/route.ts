import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiClient } from "@/lib/gemini/gemini-client";

/**
 * GET /api/gemini/health - Health check for Gemini API
 * 
 * Checks if Gemini API is configured and working
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only allow admin and staff to check health
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const healthCheck = await geminiClient.healthCheck();
    
    return NextResponse.json({
      ...healthCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Gemini health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

