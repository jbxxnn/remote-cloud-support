import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiClient } from "@/lib/gemini/gemini-client";

/**
 * GET /api/gemini/models - List available Gemini models
 * 
 * Returns a list of all available models from the Gemini API
 * and their supported methods.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only allow admin and staff to list models
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const modelsResponse = await geminiClient.listAvailableModels();
    const suggestedModel = geminiClient.selectBestModel(modelsResponse.models);
    
    return NextResponse.json({
      status: 'ok',
      ...modelsResponse,
      suggestedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing Gemini models:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

