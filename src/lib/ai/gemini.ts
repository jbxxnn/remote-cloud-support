import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

export interface CallAnalysisResult {
  transcription: string;
  summary: string;
  sopCompliance: {
    followed: boolean;
    missingSteps: string[];
    feedback: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
}

export async function analyzeCallRecording(
  recordingUrl: string, 
  clientName: string
): Promise<CallAnalysisResult> {
  // 1. In a real scenario, we would download the file from Supabase 
  // or pass the buffer directly. For Gemini File API, we need a local file or public URL.
  // Since we are simulating, we'll assume Gemini can see the file or we use a small demo prompt.

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this support call between a staff member and the client "${clientName}".
    
    Tasks:
    1. Provide a full transcription.
    2. Provide a concise summary of the issue and resolution.
    3. Check for SOP compliance:
       - Did the staff greet the client?
       - Did they verify the technician's identity?
       - Was the resolution clear?
    4. Detect overall sentiment.

    Return the result in JSON format:
    {
      "transcription": "...",
      "summary": "...",
      "sopCompliance": {
        "followed": true/false,
        "missingSteps": ["..."],
        "feedback": "..."
      },
      "sentiment": "positive/neutral/negative"
    }
  `;

  try {
    // For this implementation, we simulate the AI response to show the integration.
    // If a real recording file existed and was uploaded to Gemini's File API:
    // const uploadResult = await fileManager.uploadFile(path, { mimeType: "video/webm" });
    // const result = await model.generateContent([prompt, { fileData: { fileUri: uploadResult.file.uri, mimeType: uploadResult.file.mimeType } }]);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up JSON from markdown if necessary
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as CallAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze call recording");
  }
}
