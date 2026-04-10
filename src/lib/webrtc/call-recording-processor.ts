import { execFile } from "child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

import { processRecording } from "@/lib/gemini/recording-processor";
import { query } from "@/lib/database";

const execFileAsync = promisify(execFile);

interface CallRecordingProcessingInput {
  callSessionId: string;
  recordingUrl: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  recordedBy: string;
}

async function ensureAppRecording(input: CallRecordingProcessingInput) {
  const existingResult = await query(
    'SELECT id FROM "Recording" WHERE "filePath" = $1 LIMIT 1',
    [input.storagePath]
  );

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0].id as string;
  }

  const callSessionResult = await query(
    `SELECT "clientId", "alertId", "sopResponseId", "initiatedBy"
     FROM "CallSession"
     WHERE id = $1
     LIMIT 1`,
    [input.callSessionId]
  );

  if (callSessionResult.rows.length === 0) {
    throw new Error(`CallSession ${input.callSessionId} not found`);
  }

  const callSession = callSessionResult.rows[0];

  const result = await query(
    `INSERT INTO "Recording" (
      "alertId", "sopResponseId", "clientId", "recordingType",
      "fileUrl", "filePath", "fileName", "mimeType", "fileSize",
      "source", "processingStatus", "recordedBy"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id`,
    [
      callSession.alertId || null,
      callSession.sopResponseId || null,
      callSession.clientId,
      "video",
      input.recordingUrl,
      input.storagePath,
      path.basename(input.storagePath),
      input.mimeType,
      input.fileSize,
      "webrtc_call",
      "processing",
      callSession.initiatedBy || input.recordedBy,
    ]
  );

  return result.rows[0].id as string;
}

async function extractAudioFromRecording(storagePath: string) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "call-recording-"));
  const outputPath = path.join(tempDir, `${path.basename(storagePath, path.extname(storagePath))}.wav`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      storagePath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      outputPath,
    ]);

    const buffer = await readFile(outputPath);
    return { buffer, outputPath, tempDir };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export async function processCallRecordingUpload(input: CallRecordingProcessingInput) {
  let tempDir: string | null = null;

  try {
    const recordingId = await ensureAppRecording(input);
    const audioExtraction = await extractAudioFromRecording(input.storagePath);
    tempDir = audioExtraction.tempDir;

    const result = await processRecording(recordingId, {
      buffer: audioExtraction.buffer,
      mimeType: "audio/wav",
      fileName: `${path.basename(input.storagePath, path.extname(input.storagePath))}.wav`,
      fileSize: audioExtraction.buffer.byteLength,
    });

    if (!result.success || !result.transcriptId) {
      throw new Error(result.error || "Processing completed without transcriptId");
    }

    await query(
      `UPDATE "CallRecording"
       SET "transcriptId" = $1,
           "processingStatus" = 'completed',
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "callSessionId" = $2`,
      [result.transcriptId, input.callSessionId]
    );

    await query(
      `UPDATE "Recording"
       SET "processingStatus" = 'completed'
       WHERE id = $1`,
      [recordingId]
    );

    await query(
      `INSERT INTO "CallEvent" ("callSessionId", "type", "payload")
       VALUES ($1, $2, $3)`,
      [
        input.callSessionId,
        "recording_processed",
        JSON.stringify({ recordingId, transcriptId: result.transcriptId, processingTime: result.processingTime }),
      ]
    );
  } catch (error) {
    console.error("Failed to process call recording upload:", error);

    await query(
      `UPDATE "CallRecording"
       SET "processingStatus" = 'failed',
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "callSessionId" = $1`,
      [input.callSessionId]
    );

    const existingRecording = await query(
      'SELECT id FROM "Recording" WHERE "filePath" = $1 LIMIT 1',
      [input.storagePath]
    );

    if (existingRecording.rows.length > 0) {
      await query(
        `UPDATE "Recording"
         SET "processingStatus" = 'failed'
         WHERE id = $1`,
        [existingRecording.rows[0].id]
      );
    }

    await query(
      `INSERT INTO "CallEvent" ("callSessionId", "type", "payload")
       VALUES ($1, $2, $3)`,
      [
        input.callSessionId,
        "recording_failed",
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown processing error" }),
      ]
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
