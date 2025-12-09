/**
 * Tag Generator Service
 * 
 * Uses Gemini AI to analyze transcripts and extract tags:
 * - Tone: calm, agitated, distressed, etc.
 * - Motion: movement detected, fall, etc.
 * - Risk words: medical terms, emergency phrases
 * - Keywords: important phrases
 */

import { geminiClient } from './gemini-client';
import { query } from '@/lib/database';

export interface Tag {
  tagType: 'tone' | 'motion' | 'risk_word' | 'keyword';
  tagValue: string;
  confidence: number;
  timestamp?: number; // in seconds from start
  context?: string;
}

export interface TagGenerationResult {
  tags: Tag[];
  processingTime: number;
}

/**
 * Generate tags from transcript using Gemini
 */
export async function generateTagsFromTranscript(
  transcriptId: string,
  recordingId: string,
  transcriptText: string
): Promise<TagGenerationResult> {
  const startTime = Date.now();

  try {
    console.log(`[Tag Generator] Starting tag generation for transcript ${transcriptId}...`);

    // Create prompt for Gemini to analyze transcript
    const prompt = createTagAnalysisPrompt(transcriptText);

    // Call Gemini to analyze transcript
    const response = await geminiClient.generateText(prompt, {
      temperature: 0.3, // Lower temperature for more consistent tag extraction
      maxTokens: 2048,
    });

    // Parse Gemini response to extract tags
    const tags = parseGeminiTagResponse(response.text);

    // Store tags in database
    const storedTags: Tag[] = [];
    for (const tag of tags) {
      const result = await query(`
        INSERT INTO "NotationTag" (
          id, "transcriptId", "recordingId", "tagType", "tagValue", 
          "confidence", "timestamp", "context", "createdAt"
        )
        VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
        )
        RETURNING *
      `, [
        transcriptId,
        recordingId,
        tag.tagType,
        tag.tagValue,
        tag.confidence,
        tag.timestamp || null,
        tag.context || null,
      ]);

      storedTags.push({
        tagType: tag.tagType,
        tagValue: tag.tagValue,
        confidence: tag.confidence,
        timestamp: tag.timestamp,
        context: tag.context,
      });
    }

    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[Tag Generator] Generated ${storedTags.length} tags in ${processingTime}s`);

    return {
      tags: storedTags,
      processingTime,
    };
  } catch (error) {
    console.error('Tag generation error:', error);
    throw new Error(`Failed to generate tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create prompt for Gemini to analyze transcript and extract tags
 */
function createTagAnalysisPrompt(transcriptText: string): string {
  return `Analyze the following transcript from a support call or alert resolution conversation. Extract tags in the following categories:

1. **Tone**: Identify the emotional tone (e.g., "calm", "agitated", "distressed", "professional", "frustrated", "relieved")
2. **Motion**: Identify any motion-related keywords (e.g., "fall", "movement", "walking", "standing", "sitting")
3. **Risk Words**: Identify medical terms, emergency phrases, or concerning language (e.g., "emergency", "hospital", "pain", "injury", "medication", "ambulance")
4. **Keywords**: Extract important phrases or key terms that summarize the conversation

Return your analysis as a JSON array with this exact format:
[
  {"tagType": "tone", "tagValue": "calm", "confidence": 0.9, "context": "Client spoke calmly throughout"},
  {"tagType": "motion", "tagValue": "fall", "confidence": 0.95, "context": "Client mentioned falling"},
  {"tagType": "risk_word", "tagValue": "emergency", "confidence": 0.85, "context": "Emergency services mentioned"},
  {"tagType": "keyword", "tagValue": "false alarm", "confidence": 0.8, "context": "Client confirmed it was a false alarm"}
]

Transcript:
${transcriptText}

Return only the JSON array, no additional text.`;
}

/**
 * Parse Gemini response to extract tags
 */
function parseGeminiTagResponse(responseText: string): Tag[] {
  try {
    // Try to extract JSON from response (Gemini might add markdown or extra text)
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Try to find JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Parse JSON
    const tags = JSON.parse(jsonText) as any[];

    // Validate and normalize tags
    return tags
      .filter((tag: any) => {
        // Validate required fields
        return (
          tag.tagType &&
          tag.tagValue &&
          ['tone', 'motion', 'risk_word', 'keyword'].includes(tag.tagType)
        );
      })
      .map((tag: any) => ({
        tagType: tag.tagType as Tag['tagType'],
        tagValue: String(tag.tagValue).toLowerCase().trim(),
        confidence: typeof tag.confidence === 'number' ? Math.max(0, Math.min(1, tag.confidence)) : 0.7,
        timestamp: tag.timestamp ? parseInt(String(tag.timestamp)) : undefined,
        context: tag.context ? String(tag.context) : undefined,
      }));
  } catch (error) {
    console.error('Failed to parse Gemini tag response:', error);
    console.error('Response text:', responseText);
    
    // Fallback: Try to extract basic tags using simple pattern matching
    return extractBasicTagsFallback(responseText);
  }
}

/**
 * Fallback tag extraction using simple pattern matching
 * Used when JSON parsing fails
 */
function extractBasicTagsFallback(text: string): Tag[] {
  const tags: Tag[] = [];
  const lowerText = text.toLowerCase();

  // Tone detection
  const tonePatterns = {
    calm: ['calm', 'relaxed', 'peaceful'],
    agitated: ['agitated', 'upset', 'frustrated', 'angry'],
    distressed: ['distressed', 'worried', 'anxious', 'panicked'],
    professional: ['professional', 'polite', 'courteous'],
  };

  for (const [tone, patterns] of Object.entries(tonePatterns)) {
    if (patterns.some(p => lowerText.includes(p))) {
      tags.push({
        tagType: 'tone',
        tagValue: tone,
        confidence: 0.6,
      });
    }
  }

  // Motion detection
  const motionWords = ['fall', 'fell', 'walking', 'movement', 'standing', 'sitting'];
  for (const word of motionWords) {
    if (lowerText.includes(word)) {
      tags.push({
        tagType: 'motion',
        tagValue: word,
        confidence: 0.7,
      });
    }
  }

  // Risk words
  const riskWords = ['emergency', 'hospital', 'ambulance', 'pain', 'injury', 'medication', 'medical'];
  for (const word of riskWords) {
    if (lowerText.includes(word)) {
      tags.push({
        tagType: 'risk_word',
        tagValue: word,
        confidence: 0.8,
      });
    }
  }

  return tags;
}

/**
 * Get tags for a recording
 */
export async function getTagsForRecording(recordingId: string): Promise<Tag[]> {
  try {
    const result = await query(
      'SELECT * FROM "NotationTag" WHERE "recordingId" = $1 ORDER BY "timestamp" ASC NULLS LAST, "createdAt" ASC',
      [recordingId]
    );

    return result.rows.map((row: any) => ({
      tagType: row.tagType,
      tagValue: row.tagValue,
      confidence: row.confidence,
      timestamp: row.timestamp,
      context: row.context,
    }));
  } catch (error) {
    console.error('Failed to get tags for recording:', error);
    return [];
  }
}

/**
 * Get tags for a transcript
 */
export async function getTagsForTranscript(transcriptId: string): Promise<Tag[]> {
  try {
    const result = await query(
      'SELECT * FROM "NotationTag" WHERE "transcriptId" = $1 ORDER BY "timestamp" ASC NULLS LAST, "createdAt" ASC',
      [transcriptId]
    );

    return result.rows.map((row: any) => ({
      tagType: row.tagType,
      tagValue: row.tagValue,
      confidence: row.confidence,
      timestamp: row.timestamp,
      context: row.context,
    }));
  } catch (error) {
    console.error('Failed to get tags for transcript:', error);
    return [];
  }
}

/**
 * Get tags by type
 */
export async function getTagsByType(
  recordingId: string,
  tagType: Tag['tagType']
): Promise<Tag[]> {
  try {
    const result = await query(
      'SELECT * FROM "NotationTag" WHERE "recordingId" = $1 AND "tagType" = $2 ORDER BY "timestamp" ASC NULLS LAST',
      [recordingId, tagType]
    );

    return result.rows.map((row: any) => ({
      tagType: row.tagType,
      tagValue: row.tagValue,
      confidence: row.confidence,
      timestamp: row.timestamp,
      context: row.context,
    }));
  } catch (error) {
    console.error('Failed to get tags by type:', error);
    return [];
  }
}

