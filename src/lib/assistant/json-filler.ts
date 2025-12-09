/**
 * JSON Filler Service
 * 
 * Extracts data from context and fills structured JSON schemas
 * for exports, reports, and API responses.
 */

import { AssistantContextPayload } from './types';
import { analyzeTags } from './tag-interpreter';
import { getTagsForRecording } from '@/lib/gemini/tag-generator';
import { getTranscript } from '@/lib/gemini/transcription-service';
import { detectEscalation } from './escalation-detector';

export interface JSONSchema {
  name: string;
  description: string;
  schema: Record<string, any>;
}

export interface FilledJSON {
  schema: string;
  data: Record<string, any>;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Available JSON schemas for different use cases
 */
export const JSON_SCHEMAS: Record<string, JSONSchema> = {
  alert_summary: {
    name: 'Alert Summary',
    description: 'Comprehensive alert summary with AI analysis',
    schema: {
      alert: {
        id: 'string',
        message: 'string',
        status: 'string',
        type: 'string',
        severity: 'string',
        createdAt: 'string',
        updatedAt: 'string',
      },
      client: {
        id: 'string',
        name: 'string',
        email: 'string',
        phone: 'string',
      },
      detection: {
        type: 'string',
        location: 'string',
        confidence: 'number',
        timestamp: 'string',
      },
      aiAnalysis: {
        riskLevel: 'string',
        summary: 'string',
        insights: 'array',
        tags: 'array',
      },
      escalation: {
        shouldEscalate: 'boolean',
        escalationLevel: 'string',
        escalationScore: 'number',
        recommendedAction: 'string',
      },
      recordings: 'array',
      transcripts: 'array',
      sopResponses: 'array',
      activityTimeline: 'array',
    },
  },
  sop_response: {
    name: 'SOP Response',
    description: 'SOP response with completion status and recommendations',
    schema: {
      sopResponse: {
        id: 'string',
        sopId: 'string',
        status: 'string',
        startedAt: 'string',
        completedAt: 'string',
        completedSteps: 'array',
      },
      sop: {
        id: 'string',
        name: 'string',
        eventType: 'string',
        steps: 'array',
      },
      recommendations: {
        nextStep: 'object',
        urgentActions: 'array',
        summary: 'string',
      },
      progress: {
        completed: 'number',
        total: 'number',
        percentage: 'number',
      },
    },
  },
  recording_analysis: {
    name: 'Recording Analysis',
    description: 'Complete analysis of a recording with tags and transcript',
    schema: {
      recording: {
        id: 'string',
        recordingType: 'string',
        fileName: 'string',
        createdAt: 'string',
      },
      transcript: {
        text: 'string',
        language: 'string',
        confidence: 'number',
      },
      tags: {
        tone: 'array',
        motion: 'array',
        riskWords: 'array',
        keywords: 'array',
      },
      analysis: {
        riskLevel: 'string',
        summary: 'string',
        insights: 'array',
      },
      escalation: {
        shouldEscalate: 'boolean',
        escalationLevel: 'string',
        escalationScore: 'number',
      },
    },
  },
  incident_report: {
    name: 'Incident Report',
    description: 'Complete incident report with all related data',
    schema: {
      incident: {
        alertId: 'string',
        clientId: 'string',
        type: 'string',
        severity: 'string',
        status: 'string',
        createdAt: 'string',
        resolvedAt: 'string',
      },
      client: {
        id: 'string',
        name: 'string',
        contact: 'object',
      },
      timeline: 'array',
      actions: {
        sopResponses: 'array',
        recordings: 'array',
        notes: 'array',
      },
      aiAnalysis: {
        riskLevel: 'string',
        escalation: 'object',
        recommendations: 'array',
      },
      resolution: {
        outcome: 'string',
        notes: 'string',
        resolvedBy: 'string',
      },
    },
  },
};

/**
 * Fill alert summary JSON
 */
export async function fillAlertSummaryJSON(
  context: AssistantContextPayload
): Promise<FilledJSON> {
  if (typeof window !== 'undefined') {
    throw new Error('JSON filling is a server-side operation');
  }

  const alert = context.context?.alert;
  const client = context.context?.client;
  const alertId = context.alert_id || alert?.id;

  if (!alertId) {
    throw new Error('Alert ID is required for alert summary JSON');
  }

  const { query } = await import('@/lib/database');

  // Fetch comprehensive alert data
  const alertResult = await query(
    `
    SELECT
      a.*,
      d."detectionType",
      d.location,
      d.confidence,
      d.severity,
      d.timestamp as "detectionTimestamp",
      c.name as "clientName",
      c.email as "clientEmail",
      c.phone as "clientPhone"
    FROM "Alert" a
    LEFT JOIN "Detection" d ON a."detectionId" = d.id
    LEFT JOIN "Client" c ON a."clientId" = c.id
    WHERE a.id = $1
  `,
    [alertId]
  );

  if (alertResult.rows.length === 0) {
    throw new Error('Alert not found');
  }

  const alertData = alertResult.rows[0];

  // Fetch recordings
  const recordingsResult = await query(
    'SELECT * FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC',
    [alertId]
  );

  // Fetch SOP responses
  const sopResponsesResult = await query(
    `
    SELECT
      sr.*,
      s.name as "sopName"
    FROM "SOPResponse" sr
    LEFT JOIN "SOP" s ON sr."sopId" = s.id
    WHERE sr."alertId" = $1
    ORDER BY sr."startedAt" DESC
  `,
    [alertId]
  );

  // Fetch activity timeline
  const eventsResult = await query(
    `
    SELECT
      ae.*,
      u.name as "staffName"
    FROM "AlertEvent" ae
    LEFT JOIN "User" u ON ae."staffId" = u.id
    WHERE ae."alertId" = $1
    ORDER BY ae."createdAt" ASC
  `,
    [alertId]
  );

  // Get AI analysis for first recording
  let aiAnalysis: any = null;
  let escalation: any = null;
  let tags: any[] = [];
  let transcript: any = null;

  if (recordingsResult.rows.length > 0) {
    const recording = recordingsResult.rows[0];
    tags = await getTagsForRecording(recording.id);
    transcript = await getTranscript(recording.id);
    
    if (tags.length > 0) {
      aiAnalysis = await analyzeTags(recording.id);
    }
    
    escalation = await detectEscalation(alertId, recording.id);
  }

  const jsonData: Record<string, any> = {
    alert: {
      id: alertData.id,
      message: alertData.message,
      status: alertData.status,
      type: alertData.type,
      severity: alertData.severity,
      createdAt: alertData.createdAt,
      updatedAt: alertData.updatedAt,
    },
    client: {
      id: alertData.clientId,
      name: alertData.clientName,
      email: alertData.clientEmail,
      phone: alertData.clientPhone,
    },
    detection: {
      type: alertData.detectionType,
      location: alertData.location,
      confidence: alertData.confidence,
      timestamp: alertData.detectionTimestamp,
    },
    aiAnalysis: aiAnalysis ? {
      riskLevel: aiAnalysis.riskLevel,
      summary: aiAnalysis.summary,
      insights: aiAnalysis.insights,
      tags: tags.map(t => ({
        type: t.tagType,
        value: t.tagValue,
        confidence: t.confidence,
        timestamp: t.timestamp,
      })),
    } : null,
    escalation: escalation ? {
      shouldEscalate: escalation.shouldEscalate,
      escalationLevel: escalation.escalationLevel,
      escalationScore: escalation.escalationScore,
      recommendedAction: escalation.recommendedAction,
    } : null,
    recordings: recordingsResult.rows.map((r: any) => ({
      id: r.id,
      recordingType: r.recordingType,
      fileName: r.fileName,
      createdAt: r.createdAt,
    })),
    transcripts: transcript ? [{
      text: transcript.transcriptText,
      language: transcript.language,
      confidence: transcript.confidence,
    }] : [],
    sopResponses: sopResponsesResult.rows.map((sr: any) => ({
      id: sr.id,
      sopName: sr.sopName || 'Unknown',
      status: sr.status,
      startedAt: sr.startedAt,
      completedAt: sr.completedAt,
      completedSteps: sr.completedSteps || [],
    })),
    activityTimeline: eventsResult.rows.map((e: any) => ({
      eventType: e.eventType,
      message: e.message,
      staffName: e.staffName,
      createdAt: e.createdAt,
      metadata: e.metadata,
    })),
  };

  return {
    schema: 'alert_summary',
    data: jsonData,
    timestamp: new Date().toISOString(),
    metadata: {
      generatedBy: 'SupportSense Assistant',
      version: '1.0',
    },
  };
}

/**
 * Fill SOP response JSON
 */
export async function fillSOPResponseJSON(
  context: AssistantContextPayload
): Promise<FilledJSON> {
  if (typeof window !== 'undefined') {
    throw new Error('JSON filling is a server-side operation');
  }

  const sopResponse = context.context?.sopResponse;
  const sop = context.context?.sop;
  const sopResponseId = context.sop_response_id || sopResponse?.id;

  if (!sopResponseId) {
    throw new Error('SOP Response ID is required for SOP response JSON');
  }

  const { generateSOPRecommendations } = await import('./sop-recommender');
  const recommendations = await generateSOPRecommendations(context);

  const totalSteps = sop?.steps?.length || 0;
  const completedSteps = sopResponse?.completedSteps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const jsonData: Record<string, any> = {
    sopResponse: {
      id: sopResponse?.id,
      sopId: sopResponse?.sopId,
      status: sopResponse?.status,
      startedAt: sopResponse?.startedAt,
      completedAt: sopResponse?.completedAt,
      completedSteps: sopResponse?.completedSteps || [],
    },
    sop: {
      id: sop?.id,
      name: sop?.name,
      eventType: sop?.eventType,
      steps: sop?.steps || [],
    },
    recommendations: {
      nextStep: recommendations.nextStep,
      urgentActions: recommendations.urgentActions,
      summary: recommendations.summary,
    },
    progress: {
      completed: completedSteps,
      total: totalSteps,
      percentage: progress,
    },
  };

  return {
    schema: 'sop_response',
    data: jsonData,
    timestamp: new Date().toISOString(),
    metadata: {
      generatedBy: 'SupportSense Assistant',
      version: '1.0',
    },
  };
}

/**
 * Fill recording analysis JSON
 */
export async function fillRecordingAnalysisJSON(
  recordingId: string
): Promise<FilledJSON> {
  if (typeof window !== 'undefined') {
    throw new Error('JSON filling is a server-side operation');
  }

  const { query } = await import('@/lib/database');

  // Fetch recording
  const recordingResult = await query(
    'SELECT * FROM "Recording" WHERE id = $1',
    [recordingId]
  );

  if (recordingResult.rows.length === 0) {
    throw new Error('Recording not found');
  }

  const recording = recordingResult.rows[0];

  // Get transcript
  const transcript = await getTranscript(recordingId);

  // Get tags
  const allTags = await getTagsForRecording(recordingId);
  const tags = {
    tone: allTags.filter(t => t.tagType === 'tone'),
    motion: allTags.filter(t => t.tagType === 'motion'),
    riskWords: allTags.filter(t => t.tagType === 'risk_word'),
    keywords: allTags.filter(t => t.tagType === 'keyword'),
  };

  // Get analysis
  const analysis = allTags.length > 0 ? await analyzeTags(recordingId) : null;

  // Get escalation
  const escalation = await detectEscalation(recording.alertId || '', recordingId);

  const jsonData: Record<string, any> = {
    recording: {
      id: recording.id,
      recordingType: recording.recordingType,
      fileName: recording.fileName,
      createdAt: recording.createdAt,
    },
    transcript: transcript ? {
      text: transcript.transcriptText,
      language: transcript.language,
      confidence: transcript.confidence,
    } : null,
    tags: {
      tone: tags.tone.map(t => ({
        value: t.tagValue,
        confidence: t.confidence,
        timestamp: t.timestamp,
        context: t.context,
      })),
      motion: tags.motion.map(t => ({
        value: t.tagValue,
        confidence: t.confidence,
        timestamp: t.timestamp,
        context: t.context,
      })),
      riskWords: tags.riskWords.map(t => ({
        value: t.tagValue,
        confidence: t.confidence,
        timestamp: t.timestamp,
        context: t.context,
      })),
      keywords: tags.keywords.map(t => ({
        value: t.tagValue,
        confidence: t.confidence,
        timestamp: t.timestamp,
        context: t.context,
      })),
    },
    analysis: analysis ? {
      riskLevel: analysis.riskLevel,
      summary: analysis.summary,
      insights: analysis.insights,
    } : null,
    escalation: escalation ? {
      shouldEscalate: escalation.shouldEscalate,
      escalationLevel: escalation.escalationLevel,
      escalationScore: escalation.escalationScore,
    } : null,
  };

  return {
    schema: 'recording_analysis',
    data: jsonData,
    timestamp: new Date().toISOString(),
    metadata: {
      generatedBy: 'SupportSense Assistant',
      version: '1.0',
    },
  };
}

/**
 * Get available schemas
 */
export function getAvailableSchemas(): JSONSchema[] {
  return Object.values(JSON_SCHEMAS);
}

/**
 * Validate JSON output against schema
 */
export function validateJSONOutput(
  data: Record<string, any>,
  schemaName: string
): { valid: boolean; errors?: string[] } {
  const schema = JSON_SCHEMAS[schemaName];
  if (!schema) {
    return { valid: false, errors: [`Schema ${schemaName} not found`] };
  }

  // Basic validation - check if required top-level keys exist
  const errors: string[] = [];
  const schemaKeys = Object.keys(schema.schema);

  for (const key of schemaKeys) {
    if (schema.schema[key] !== 'array' && !data[key]) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

