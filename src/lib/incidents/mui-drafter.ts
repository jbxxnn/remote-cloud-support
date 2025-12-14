/**
 * MUI Drafter Service
 * 
 * Auto-generates MUI/UI incident drafts from SOP responses, annotations, timeline, and validator results
 */

import { query } from '@/lib/database';
import { getTagsForRecording } from '@/lib/gemini/tag-generator';
import { getTranscript } from '@/lib/gemini/transcription-service';
import { analyzeTags } from '@/lib/assistant/tag-interpreter';
import { detectEscalation } from '@/lib/assistant/escalation-detector';
import type { ValidationContext } from '@/lib/validation/types';

/**
 * MUI/UI Incident Type
 */
export type IncidentType = 'MUI' | 'UI';

/**
 * MUI Draft Data Structure
 */
export interface MUIDraftData {
  /** Incident type */
  incidentType: IncidentType;
  
  /** Date and time of incident */
  incidentDate: string;
  incidentTime: string;
  
  /** Location of incident */
  location?: string;
  
  /** Client information */
  client: {
    id: string;
    name: string;
  };
  
  /** Description of incident */
  description: string;
  
  /** Staff who responded */
  staff: {
    id: string;
    name: string;
  }[];
  
  /** Actions taken */
  actionsTaken: string[];
  
  /** Timeline of events */
  timeline: Array<{
    timestamp: string;
    event: string;
    staff?: string;
  }>;
  
  /** Related SOP responses */
  sopResponses: Array<{
    id: string;
    sopName: string;
    status: string;
    completedSteps: number;
    totalSteps: number;
  }>;
  
  /** AI Analysis */
  aiAnalysis?: {
    riskLevel: string;
    summary: string;
    criticalTags: string[];
    escalationLevel?: string;
  };
  
  /** Validator results */
  validationResults?: {
    isValid: boolean;
    errors: number;
    warnings: number;
  };
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Draft generation options
 */
export interface DraftOptions {
  /** Include AI analysis */
  includeAIAnalysis?: boolean;
  
  /** Include validation results */
  includeValidation?: boolean;
  
  /** Include timeline */
  includeTimeline?: boolean;
}

/**
 * Determine incident type from tags and context
 */
export function determineIncidentType(
  tags: any[],
  alertType?: string,
  detectionType?: string
): IncidentType {
  // Check for MUI indicators (more serious)
  const muiIndicators = [
    'fall', 'injury', 'hospital', 'ambulance', 'emergency', 'unresponsive',
    'medical emergency', 'serious injury', 'critical'
  ];

  // Check for UI indicators (less serious but still reportable)
  const uiIndicators = [
    'agitated', 'behavioral', 'minor', 'concern', 'unusual'
  ];

  const tagValues = tags.map(t => t.tagValue?.toLowerCase() || '').join(' ');
  const contextText = `${alertType || ''} ${detectionType || ''} ${tagValues}`.toLowerCase();

  // Check for MUI indicators first (higher priority)
  for (const indicator of muiIndicators) {
    if (contextText.includes(indicator)) {
      return 'MUI';
    }
  }

  // Check for UI indicators
  for (const indicator of uiIndicators) {
    if (contextText.includes(indicator)) {
      return 'UI';
    }
  }

  // Default based on severity
  // High severity detections or critical risk levels suggest MUI
  // For now, default to UI (can be changed during review)
  return 'UI';
}

/**
 * Generate MUI draft from alert
 */
export async function generateMUIDraft(
  alertId: string,
  options: DraftOptions = {}
): Promise<MUIDraftData> {
  const {
    includeAIAnalysis = true,
    includeValidation = true,
    includeTimeline = true,
  } = options;

  // Fetch alert with related data
  const alertResult = await query(
    `
    SELECT
      a.*,
      d."detectionType",
      d.location as "detectionLocation",
      d.severity,
      d.timestamp as "detectionTimestamp",
      c.name as "clientName",
      c.id as "clientId"
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

  const alert = alertResult.rows[0];
  const incidentDate = new Date(alert.createdAt);

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

  // Fetch timeline (AlertEvents)
  const timelineResult = await query(
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

  // Fetch recordings and get AI analysis
  let tags: any[] = [];
  let transcript: any = null;
  let aiAnalysis: any = null;
  let escalationResult: any = null;

  if (includeAIAnalysis) {
    const recordingResult = await query(
      'SELECT id FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [alertId]
    );

    if (recordingResult.rows.length > 0) {
      const recordingId = recordingResult.rows[0].id;
      tags = await getTagsForRecording(recordingId);
      transcript = await getTranscript(recordingId);
      
      if (tags.length > 0) {
        aiAnalysis = await analyzeTags(recordingId);
      }
      
      escalationResult = await detectEscalation(alertId, recordingId);
    }
  }

  // Determine incident type
  const incidentType = determineIncidentType(
    tags,
    alert.type,
    alert.detectionType
  );

  // Build actions taken from SOP responses
  const actionsTaken: string[] = [];
  sopResponsesResult.rows.forEach((sopResponse: any) => {
    if (sopResponse.completedSteps && Array.isArray(sopResponse.completedSteps)) {
      sopResponse.completedSteps.forEach((step: any) => {
        if (step.action) {
          actionsTaken.push(`${step.action}${step.notes ? `: ${step.notes}` : ''}`);
        }
      });
    }
  });

  // Build timeline
  const timeline = includeTimeline
    ? timelineResult.rows.map((event: any) => ({
        timestamp: event.createdAt,
        event: event.eventType.replace(/_/g, ' '),
        staff: event.staffName || 'Unknown',
        message: event.message,
      }))
    : [];

  // Build description from various sources
  let description = `Incident occurred: ${alert.message}\n`;
  if (alert.detectionType) {
    description += `Detection Type: ${alert.detectionType.replace(/_/g, ' ')}\n`;
  }
  if (transcript) {
    const excerpt = transcript.transcriptText.length > 300
      ? transcript.transcriptText.substring(0, 300) + '...'
      : transcript.transcriptText;
    description += `\nTranscript Excerpt:\n${excerpt}\n`;
  }
  if (aiAnalysis) {
    description += `\nAI Analysis: ${aiAnalysis.summary}\n`;
  }

  // Get staff who responded
  const staffSet = new Set<string>();
  timelineResult.rows.forEach((event: any) => {
    if (event.staffId) {
      staffSet.add(event.staffId);
    }
  });
  sopResponsesResult.rows.forEach((sopResponse: any) => {
    if (sopResponse.staffId) {
      staffSet.add(sopResponse.staffId);
    }
  });

  const staffResult = await query(
    'SELECT id, name FROM "User" WHERE id = ANY($1::text[])',
    [Array.from(staffSet)]
  );

  // Run validation if requested
  let validationResults: any = null;
  if (includeValidation) {
    try {
      const { validatorEngine } = await import('@/lib/validation/validator-engine');
      
      // Validate SOP responses
      const validationContext: ValidationContext = {
        clientId: alert.clientId,
        alertId: alertId,
      };

      const validationPromises = sopResponsesResult.rows.map((sopResponse: any) => {
        const sopResult = query(
          'SELECT steps FROM "SOP" WHERE id = $1',
          [sopResponse.sopId]
        );
        return sopResult.then((sop: any) => {
          if (sop.rows.length > 0) {
            return validatorEngine.validate('sop', {
              steps: sop.rows[0].steps || [],
              completedSteps: sopResponse.completedSteps || [],
            }, validationContext);
          }
          return null;
        });
      });

      const validationResultsList = await Promise.all(validationPromises);
      const allErrors = validationResultsList.flatMap(r => r?.errors || []);
      const allWarnings = validationResultsList.flatMap(r => r?.warnings || []);

      validationResults = {
        isValid: allErrors.length === 0,
        errors: allErrors.length,
        warnings: allWarnings.length,
      };
    } catch (error) {
      console.error('Failed to run validation for draft:', error);
    }
  }

  // Build draft data
  const draftData: MUIDraftData = {
    incidentType,
    incidentDate: incidentDate.toISOString().split('T')[0],
    incidentTime: incidentDate.toTimeString().split(' ')[0],
    location: alert.detectionLocation || alert.location || 'Location not specified',
    client: {
      id: alert.clientId,
      name: alert.clientName,
    },
    description: description.trim(),
    staff: staffResult.rows.map((s: any) => ({
      id: s.id,
      name: s.name,
    })),
    actionsTaken,
    timeline,
    sopResponses: sopResponsesResult.rows.map((sr: any) => ({
      id: sr.id,
      sopName: sr.sopName || 'Unknown SOP',
      status: sr.status,
      completedSteps: sr.completedSteps?.length || 0,
      totalSteps: (sr.completedSteps?.length || 0) + (sr.completedSteps ? 0 : 1), // Estimate
    })),
    metadata: {
      alertId,
      detectionType: alert.detectionType,
      severity: alert.severity,
    },
  };

  // Add AI analysis if available
  if (includeAIAnalysis && aiAnalysis) {
    draftData.aiAnalysis = {
      riskLevel: aiAnalysis.riskLevel,
      summary: aiAnalysis.summary,
      criticalTags: tags
        .filter((t: any) =>
          t.tagType === 'risk_word' ||
          (t.tagType === 'tone' && ['agitated', 'distressed'].includes(t.tagValue)) ||
          (t.tagType === 'motion' && t.tagValue === 'fall')
        )
        .map((t: any) => t.tagValue),
      escalationLevel: escalationResult?.escalationLevel,
    };
  }

  // Add validation results if available
  if (includeValidation && validationResults) {
    draftData.validationResults = validationResults;
  }

  return draftData;
}

