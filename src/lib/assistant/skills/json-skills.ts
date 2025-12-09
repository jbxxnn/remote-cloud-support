/**
 * JSON Skills - Query handlers for JSON-related assistant queries
 */

import { AssistantContextPayload } from '../types';
import {
  fillAlertSummaryJSON,
  fillSOPResponseJSON,
  fillRecordingAnalysisJSON,
  getAvailableSchemas,
  validateJSONOutput,
  FilledJSON,
} from '../json-filler';

/**
 * Handle JSON-related queries
 */
export async function handleJSONQuery(
  queryText: string,
  context: AssistantContextPayload
): Promise<string> {
  if (typeof window !== 'undefined') {
    return "JSON generation is a server-side operation and cannot be performed in the browser.";
  }

  const lowerQuery = queryText.toLowerCase();

  // List available schemas
  if (lowerQuery.includes('list schemas') || lowerQuery.includes('available schemas') || 
      lowerQuery.includes('what schemas')) {
    const schemas = getAvailableSchemas();
    let response = `## Available JSON Schemas\n\n`;
    schemas.forEach((schema, index) => {
      response += `${index + 1}. **${schema.name}**\n`;
      response += `   ${schema.description}\n\n`;
    });
    return response;
  }

  // Generate alert summary JSON
  if (lowerQuery.includes('alert summary json') || lowerQuery.includes('export alert json') ||
      (lowerQuery.includes('json') && lowerQuery.includes('alert'))) {
    try {
      const json = await fillAlertSummaryJSON(context);
      return formatJSONResponse(json, 'Alert Summary JSON');
    } catch (error) {
      return `Failed to generate alert summary JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // Generate SOP response JSON
  if (lowerQuery.includes('sop response json') || lowerQuery.includes('export sop json') ||
      (lowerQuery.includes('json') && lowerQuery.includes('sop'))) {
    try {
      const json = await fillSOPResponseJSON(context);
      return formatJSONResponse(json, 'SOP Response JSON');
    } catch (error) {
      return `Failed to generate SOP response JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // Generate recording analysis JSON
  if (lowerQuery.includes('recording json') || lowerQuery.includes('export recording json') ||
      (lowerQuery.includes('json') && lowerQuery.includes('recording'))) {
    try {
      // Try to get recording ID from context
      const alertId = context.alert_id || context.context?.alert?.id;
      if (!alertId) {
        return "I need an alert ID to generate recording analysis JSON. Please navigate to an alert with a recording.";
      }

      const { query } = await import('@/lib/database');
      const recordingResult = await query(
        'SELECT id FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [alertId]
      );

      if (recordingResult.rows.length === 0) {
        return "No recording found for this alert. Please ensure a recording exists.";
      }

      const json = await fillRecordingAnalysisJSON(recordingResult.rows[0].id);
      return formatJSONResponse(json, 'Recording Analysis JSON');
    } catch (error) {
      return `Failed to generate recording analysis JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // General JSON help
  if (lowerQuery.includes('json') && (lowerQuery.includes('help') || lowerQuery.includes('how'))) {
    return `## JSON Export Help\n\n` +
           `I can generate structured JSON exports for:\n\n` +
           `1. **Alert Summary** - Complete alert data with AI analysis\n` +
           `   Ask: "Export alert JSON" or "Generate alert summary JSON"\n\n` +
           `2. **SOP Response** - SOP response with recommendations\n` +
           `   Ask: "Export SOP JSON" or "Generate SOP response JSON"\n\n` +
           `3. **Recording Analysis** - Recording with tags and transcript\n` +
           `   Ask: "Export recording JSON" or "Generate recording analysis JSON"\n\n` +
           `4. **List Schemas** - See all available JSON schemas\n` +
           `   Ask: "List available schemas" or "What JSON schemas are available"\n\n` +
           `All JSON exports include AI analysis, tags, transcripts, and recommendations when available.`;
  }

  return "I can help you generate structured JSON exports. Try asking 'export alert JSON', 'export SOP JSON', or 'list available schemas'.";
}

/**
 * Format JSON response for display
 */
function formatJSONResponse(json: FilledJSON, title: string): string {
  let response = `## ${title}\n\n`;
  response += `**Schema:** ${json.schema}\n`;
  response += `**Generated:** ${new Date(json.timestamp).toLocaleString()}\n\n`;
  
  if (json.metadata) {
    response += `**Metadata:**\n`;
    Object.entries(json.metadata).forEach(([key, value]) => {
      response += `- ${key}: ${value}\n`;
    });
    response += `\n`;
  }

  response += `**JSON Data:**\n\`\`\`json\n`;
  response += JSON.stringify(json.data, null, 2);
  response += `\n\`\`\`\n`;

  // Validate the output
  const validation = validateJSONOutput(json.data, json.schema);
  if (!validation.valid && validation.errors) {
    response += `\n⚠️ **Validation Warnings:**\n`;
    validation.errors.forEach(error => {
      response += `- ${error}\n`;
    });
  }

  return response;
}

