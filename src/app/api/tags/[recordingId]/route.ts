import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTagsForRecording, getTagsByType } from "@/lib/gemini/tag-generator";

/**
 * GET /api/tags/[recordingId] - Get tags for a recording
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recordingId } = await params;
    const { searchParams } = new URL(request.url);
    const tagType = searchParams.get('type') as 'tone' | 'motion' | 'risk_word' | 'keyword' | null;

    let tags;
    if (tagType) {
      tags = await getTagsByType(recordingId, tagType);
    } else {
      tags = await getTagsForRecording(recordingId);
    }

    return NextResponse.json({
      recordingId,
      tags,
      count: tags.length,
    });
  } catch (error) {
    console.error('Failed to get tags:', error);
    return NextResponse.json({ 
      error: "Failed to get tags",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

