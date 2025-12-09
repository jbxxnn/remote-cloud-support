/**
 * Tag Skills - Query Handlers for Tag-Related Assistant Queries
 * 
 * Handles queries about tags, transcript analysis, and insights
 */

import { AssistantContextPayload } from '../types';
import { analyzeTags, getTagSummary, getTagInsights } from '../tag-interpreter';
import { getTagsForRecording, getTagsByType } from '@/lib/gemini/tag-generator';
// Note: getTranscript is only used server-side, imported dynamically when needed

/**
 * Handle tag-related queries
 */
export async function handleTagQuery(
  query: string,
  context: AssistantContextPayload
): Promise<string> {
  const lowerQuery = query.toLowerCase();

  // Check if we have a recording/alert context
  const recordingId = await getRecordingIdFromContext(context);
  
  if (!recordingId) {
    return "I need a recording or alert context to analyze tags. Please navigate to a recording or alert detail page.";
  }

  // Analyze tags
  if (lowerQuery.includes('analyze') || lowerQuery.includes('analysis') || lowerQuery.includes('insights')) {
    return await handleAnalyzeTags(recordingId);
  }

  // Get summary
  if (lowerQuery.includes('summary') || lowerQuery.includes('summarize')) {
    return await handleTagSummary(recordingId);
  }

  // Get risk level
  if (lowerQuery.includes('risk') || lowerQuery.includes('danger') || lowerQuery.includes('urgent')) {
    return await handleRiskLevel(recordingId);
  }

  // Get specific tag types
  if (lowerQuery.includes('tone')) {
    return await handleToneTags(recordingId);
  }

  if (lowerQuery.includes('motion') || lowerQuery.includes('movement')) {
    return await handleMotionTags(recordingId);
  }

  if (lowerQuery.includes('risk word') || lowerQuery.includes('risk keyword')) {
    return await handleRiskTags(recordingId);
  }

  // Default: show all tags
  return await handleAllTags(recordingId);
}

/**
 * Handle "analyze tags" query
 */
async function handleAnalyzeTags(recordingId: string): Promise<string> {
  const analysis = await analyzeTags(recordingId);

  let response = `## Tag Analysis\n\n`;
  response += `**Risk Level:** ${analysis.riskLevel.toUpperCase()}\n\n`;
  response += `**Summary:** ${analysis.summary}\n\n`;

  if (analysis.insights.length > 0) {
    response += `### Insights\n\n`;
    analysis.insights.forEach((insight, index) => {
      response += `${index + 1}. **${insight.title}** (${insight.severity || 'N/A'})\n`;
      response += `   ${insight.message}\n`;
      if (insight.tags.length > 0) {
        response += `   Tags: ${insight.tags.join(', ')}\n`;
      }
      response += `\n`;
    });
  }

  if (analysis.keyFindings.length > 0) {
    response += `### Key Findings\n\n`;
    analysis.keyFindings.forEach((finding, index) => {
      response += `${index + 1}. ${finding}\n`;
    });
  }

  return response;
}

/**
 * Handle "tag summary" query
 */
async function handleTagSummary(recordingId: string): Promise<string> {
  const summary = await getTagSummary(recordingId);
  const insights = await getTagInsights(recordingId);

  let response = `## Tag Summary\n\n`;
  response += `${summary}\n\n`;

  if (insights.length > 0) {
    response += `### Key Insights\n\n`;
    insights.slice(0, 5).forEach((insight, index) => {
      response += `${index + 1}. **${insight.title}**: ${insight.message}\n`;
    });
  }

  return response;
}

/**
 * Handle "risk level" query
 */
async function handleRiskLevel(recordingId: string): Promise<string> {
  const analysis = await analyzeTags(recordingId);

  let response = `## Risk Assessment\n\n`;
  response += `**Risk Level:** ${analysis.riskLevel.toUpperCase()}\n\n`;

  const riskTags = await getTagsByType(recordingId, 'risk_word');
  if (riskTags.length > 0) {
    response += `**Risk Words Detected:** ${riskTags.length}\n`;
    response += `- ${riskTags.map(t => t.tagValue).join(', ')}\n\n`;
  }

  const highSeverityInsights = analysis.insights.filter(i => 
    i.severity === 'high'
  );

  if (highSeverityInsights.length > 0) {
    response += `### Concerns\n\n`;
    highSeverityInsights.forEach((insight, index) => {
      response += `${index + 1}. ${insight.title}: ${insight.message}\n`;
    });
  } else {
    response += `No high-risk indicators detected.\n`;
  }

  return response;
}

/**
 * Handle "tone tags" query
 */
async function handleToneTags(recordingId: string): Promise<string> {
  const tags = await getTagsByType(recordingId, 'tone');

  if (tags.length === 0) {
    return "No tone tags found for this recording.";
  }

  let response = `## Tone Analysis\n\n`;
  response += `Detected tones:\n\n`;

  tags.forEach(tag => {
    response += `- **${tag.tagValue}** (confidence: ${(tag.confidence * 100).toFixed(0)}%)\n`;
    if (tag.context) {
      response += `  ${tag.context}\n`;
    }
  });

  return response;
}

/**
 * Handle "motion tags" query
 */
async function handleMotionTags(recordingId: string): Promise<string> {
  const tags = await getTagsByType(recordingId, 'motion');

  if (tags.length === 0) {
    return "No motion tags found for this recording.";
  }

  let response = `## Motion Detection\n\n`;
  response += `Motion keywords detected:\n\n`;

  tags.forEach(tag => {
    response += `- **${tag.tagValue}** (confidence: ${(tag.confidence * 100).toFixed(0)}%)\n`;
    if (tag.context) {
      response += `  ${tag.context}\n`;
    }
  });

  return response;
}

/**
 * Handle "risk tags" query
 */
async function handleRiskTags(recordingId: string): Promise<string> {
  const tags = await getTagsByType(recordingId, 'risk_word');

  if (tags.length === 0) {
    return "No risk words detected in this recording.";
  }

  let response = `## Risk Words Detected\n\n`;
  response += `**Count:** ${tags.length}\n\n`;
  response += `Risk-related keywords:\n\n`;

  tags.forEach(tag => {
    response += `- **${tag.tagValue}** (confidence: ${(tag.confidence * 100).toFixed(0)}%)\n`;
    if (tag.context) {
      response += `  ${tag.context}\n`;
    }
  });

  return response;
}

/**
 * Handle "all tags" query
 */
async function handleAllTags(recordingId: string): Promise<string> {
  const tags = await getTagsForRecording(recordingId);

  if (tags.length === 0) {
    return "No tags found for this recording. The recording may not have been processed yet.";
  }

  const byType = {
    tone: tags.filter(t => t.tagType === 'tone'),
    motion: tags.filter(t => t.tagType === 'motion'),
    risk_word: tags.filter(t => t.tagType === 'risk_word'),
    keyword: tags.filter(t => t.tagType === 'keyword'),
  };

  let response = `## All Tags (${tags.length} total)\n\n`;

  if (byType.tone.length > 0) {
    response += `### Tone (${byType.tone.length})\n`;
    response += `${byType.tone.map(t => t.tagValue).join(', ')}\n\n`;
  }

  if (byType.motion.length > 0) {
    response += `### Motion (${byType.motion.length})\n`;
    response += `${byType.motion.map(t => t.tagValue).join(', ')}\n\n`;
  }

  if (byType.risk_word.length > 0) {
    response += `### Risk Words (${byType.risk_word.length})\n`;
    response += `${byType.risk_word.map(t => t.tagValue).join(', ')}\n\n`;
  }

  if (byType.keyword.length > 0) {
    response += `### Keywords (${byType.keyword.length})\n`;
    response += `${byType.keyword.map(t => t.tagValue).join(', ')}\n\n`;
  }

  return response;
}

/**
 * Get recording ID from context
 * Only works server-side - returns null on client
 */
async function getRecordingIdFromContext(context: AssistantContextPayload): Promise<string | null> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return null;
  }

  // Try to get from alert context
  if (context.alert_id) {
    // Query database to get recording ID from alert
    try {
      const { query } = await import('@/lib/database');
      const result = await query(
        'SELECT id FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [context.alert_id]
      );
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
    } catch (error) {
      console.error('Failed to get recording from alert:', error);
    }
  }

  // Try to get from SOP response context
  if (context.sop_response_id) {
    try {
      const { query } = await import('@/lib/database');
      const result = await query(
        'SELECT id FROM "Recording" WHERE "sopResponseId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [context.sop_response_id]
      );
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
    } catch (error) {
      console.error('Failed to get recording from SOP response:', error);
    }
  }

  return null;
}

