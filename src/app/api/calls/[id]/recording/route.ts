import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, transaction } from "@/lib/database";
import { processCallRecordingUpload } from "@/lib/webrtc/call-recording-processor";
import { readCallRecording, saveCallRecording } from "@/lib/webrtc/recording-storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: callSessionId } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = (session.user as any).id;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(`📥 Received recording for call ${callSessionId}, size: ${file.size} bytes`);

    const { storagePath, mimeType } = await saveCallRecording(callSessionId, file);
    const recordingUrlBase = process.env.NEXTAUTH_URL || "";
    const recordingUrl = recordingUrlBase
      ? `${recordingUrlBase}/api/calls/${callSessionId}/recording`
      : `/api/calls/${callSessionId}/recording`;

    await transaction(async (client) => {
      const existingRecording = await client.query(
        `SELECT id FROM "CallRecording" WHERE "callSessionId" = $1 LIMIT 1`,
        [callSessionId]
      );

      if (existingRecording.rows.length > 0) {
        await client.query(
          `UPDATE "CallRecording"
           SET "recordingUrl" = $1,
               "storagePath" = $2,
               "processingStatus" = 'processing',
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "callSessionId" = $3`,
          [recordingUrl, storagePath, callSessionId]
        );
      } else {
        await client.query(
          `INSERT INTO "CallRecording" ("callSessionId", "recordingUrl", "storagePath", "processingStatus")
           VALUES ($1, $2, $3, 'processing')`,
          [callSessionId, recordingUrl, storagePath]
        );
      }

      await client.query(
        `INSERT INTO "CallEvent" ("callSessionId", "type", "payload")
         VALUES ($1, $2, $3)`,
        [callSessionId, "recording_uploaded", JSON.stringify({ recordingUrl, storagePath, mimeType, size: file.size })]
      );
    });

    void processCallRecordingUpload({
      callSessionId,
      recordingUrl,
      storagePath,
      mimeType,
      fileSize: file.size,
      recordedBy: userId,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: callSessionId } = await params;
    const result = await query(
      `SELECT "storagePath" FROM "CallRecording" WHERE "callSessionId" = $1 LIMIT 1`,
      [callSessionId]
    );

    const storagePath = result.rows[0]?.storagePath;
    if (!storagePath) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const fileBuffer = await readCallRecording(storagePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "video/webm",
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching recording file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
