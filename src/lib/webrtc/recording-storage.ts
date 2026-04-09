import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const RECORDINGS_DIR = path.join(process.cwd(), "storage", "call-recordings");

export async function saveCallRecording(callSessionId: string, file: File) {
  const extension = file.name.includes(".") ? path.extname(file.name) : ".webm";
  const safeExtension = extension || ".webm";
  const fileName = `${callSessionId}${safeExtension}`;
  const storagePath = path.join(RECORDINGS_DIR, fileName);

  await mkdir(RECORDINGS_DIR, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(storagePath, buffer);

  return {
    fileName,
    storagePath,
    size: buffer.byteLength,
    mimeType: file.type || "video/webm",
  };
}

export async function readCallRecording(storagePath: string) {
  return readFile(storagePath);
}
