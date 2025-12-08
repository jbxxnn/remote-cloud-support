import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// POST /api/evidence/upload - Handle file upload
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sopResponseId = formData.get('sopResponseId') as string;
    const alertId = formData.get('alertId') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !sopResponseId) {
      return NextResponse.json({ error: "File and sopResponseId are required" }, { status: 400 });
    }

    // Determine evidence type based on file type
    let evidenceType = 'file';
    const mimeType = file.type;
    if (mimeType.startsWith('image/')) {
      evidenceType = 'photo';
    } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      evidenceType = 'recording';
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'evidence');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create file URL (relative to public folder)
    const fileUrl = `/uploads/evidence/${fileName}`;

    // Create evidence record via API
    const evidenceResponse = await fetch(`${request.nextUrl.origin}/api/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        sopResponseId,
        alertId: alertId || null,
        evidenceType,
        fileUrl,
        filePath: filePath,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        description: description || null,
      }),
    });

    if (!evidenceResponse.ok) {
      // Clean up uploaded file if evidence record creation fails
      try {
        const fs = await import('fs/promises');
        await fs.unlink(filePath);
      } catch (e) {
        console.error('Failed to clean up file:', e);
      }
      return NextResponse.json({ error: "Failed to create evidence record" }, { status: 500 });
    }

    const evidence = await evidenceResponse.json();

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error('Failed to upload evidence:', error);
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 });
  }
}

