import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: callSessionId } = params;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(`📥 Received recording for call ${callSessionId}, size: ${file.size} bytes`);

    // In a real implementation, we would upload to Supabase Storage here.
    // For now, we'll simulate the upload and update the database record.
    // We'll use a placeholder URL.
    const recordingUrl = `https://storage.supabase.co/recordings/${callSessionId}.webm`;

    // Update database
    await pool.query(
      `UPDATE "CallRecording" 
       SET "recordingUrl" = $1, 
           "processingStatus" = 'completed'
       WHERE "callSessionId" = $2`,
      [recordingUrl, callSessionId]
    );

    // Trigger AI analysis asynchronously
    import("@/lib/ai/gemini").then(async ({ analyzeCallRecording }) => {
      try {
        const analysis = await analyzeCallRecording(recordingUrl, "Client");
        await pool.query(
          `UPDATE "CallRecording"
           SET "analysisResults" = $1,
               "sentiment" = $2,
               "sopFollowed" = $3,
               "processingStatus" = 'analyzed'
           WHERE "callSessionId" = $4`,
          [
            JSON.stringify(analysis), 
            analysis.sentiment, 
            analysis.sopCompliance.followed, 
            callSessionId
          ]
        );
      } catch (err) {
        console.error("AI Analysis failed:", err);
      }
    });

    return NextResponse.json({ 
      success: true, 
      recordingUrl 
    });

  } catch (error) {
    console.error("Error handling recording upload:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
