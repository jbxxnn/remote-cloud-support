/**
 * SOP Action Recommender
 * 
 * Analyzes SOP progress, context, tags, and transcripts to recommend next actions
 */

import { AssistantContextPayload } from './types';
import { analyzeTags } from './tag-interpreter';
import { getTagsForRecording } from '@/lib/gemini/tag-generator';
import { getTranscript } from '@/lib/gemini/transcription-service';

export interface ActionRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  stepNumber?: number;
  stepAction?: string;
}

export interface SOPRecommendations {
  recommendations: ActionRecommendation[];
  nextStep?: {
    stepNumber: number;
    action: string;
    reason: string;
  };
  urgentActions: ActionRecommendation[];
  summary: string;
}

/**
 * Generate recommendations for SOP response
 */
export async function generateSOPRecommendations(
  context: AssistantContextPayload
): Promise<SOPRecommendations> {
  const sopResponse = context.context?.sopResponse;
  const sop = context.context?.sop;
  const alert = context.context?.alert;
  const client = context.context?.client;

  if (!sopResponse || !sop) {
    return {
      recommendations: [],
      urgentActions: [],
      summary: 'No SOP context available. Please navigate to an SOP response to get recommendations.',
    };
  }

  const recommendations: ActionRecommendation[] = [];
  const totalSteps = sop.steps?.length || 0;
  const completedSteps = sopResponse.completedSteps?.length || 0;
  const remainingSteps = totalSteps - completedSteps;

  // Analyze SOP progress
  const progressRecommendations = analyzeSOPProgress(sopResponse, sop, totalSteps, completedSteps, remainingSteps);
  recommendations.push(...progressRecommendations);

  // Analyze alert context
  if (alert) {
    const alertRecommendations = analyzeAlertContext(alert, sopResponse);
    recommendations.push(...alertRecommendations);
  }

  // Analyze tags and transcripts (if recording exists)
  if (typeof window === 'undefined' && alert?.id) {
    try {
      const { query } = await import('@/lib/database');
      const recordingResult = await query(
        'SELECT id FROM "Recording" WHERE "alertId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [alert.id]
      );

      if (recordingResult.rows.length > 0) {
        const recordingId = recordingResult.rows[0].id;
        const tagRecommendations = await analyzeTagsForRecommendations(recordingId, sopResponse, sop);
        recommendations.push(...tagRecommendations);
      }
    } catch (error) {
      console.error('Failed to analyze tags for recommendations:', error);
    }
  }

  // Identify next step
  const nextStep = identifyNextStep(sop, sopResponse, recommendations);

  // Sort by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const urgentActions = recommendations.filter(r => r.priority === 'high');

  // Generate summary
  const summary = generateRecommendationSummary(
    recommendations,
    nextStep,
    urgentActions,
    remainingSteps
  );

  return {
    recommendations,
    nextStep,
    urgentActions,
    summary,
  };
}

/**
 * Analyze SOP progress and generate recommendations
 */
function analyzeSOPProgress(
  sopResponse: any,
  sop: any,
  totalSteps: number,
  completedSteps: number,
  remainingSteps: number
): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];

  // Check if all steps are complete
  if (completedSteps === totalSteps && sopResponse.status !== 'completed') {
    recommendations.push({
      priority: 'high',
      action: 'Mark SOP as completed',
      reason: 'All steps have been completed. The SOP should be marked as completed.',
    });
  }

  // Check for steps without notes
  if (sopResponse.completedSteps) {
    const stepsWithoutNotes = sopResponse.completedSteps.filter(
      (step: any) => !step.notes || step.notes.trim() === ''
    );
    if (stepsWithoutNotes.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Add notes to completed steps',
        reason: `${stepsWithoutNotes.length} completed step${stepsWithoutNotes.length > 1 ? 's' : ''} are missing notes. Documentation is important for compliance.`,
      });
    }
  }

  // Identify next incomplete step
  if (completedSteps < totalSteps && remainingSteps > 0) {
    const completedStepNumbers = new Set(
      sopResponse.completedSteps?.map((s: any) => s.step) || []
    );
    const nextStepNumber = sop.steps?.findIndex(
      (step: any, index: number) => !completedStepNumbers.has(index + 1)
    );

    if (nextStepNumber !== undefined && nextStepNumber >= 0) {
      const nextStep = sop.steps[nextStepNumber];
      const stepAction = typeof nextStep === 'string' ? nextStep : nextStep.action || nextStep.text || `Step ${nextStepNumber + 1}`;
      
      recommendations.push({
        priority: 'high',
        action: `Complete Step ${nextStepNumber + 1}: ${stepAction}`,
        reason: `This is the next step in the SOP. ${remainingSteps} step${remainingSteps > 1 ? 's' : ''} remaining.`,
        stepNumber: nextStepNumber + 1,
        stepAction,
      });
    }
  }

  return recommendations;
}

/**
 * Analyze alert context for recommendations
 */
function analyzeAlertContext(alert: any, sopResponse: any): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];

  // High severity alerts
  if (alert.severity === 'high' || alert.severity === 'critical') {
    recommendations.push({
      priority: 'high',
      action: 'Prioritize this alert - high severity detected',
      reason: 'This alert has high or critical severity. Ensure all steps are completed promptly.',
    });
  }

  // Pending alerts
  if (alert.status === 'pending') {
    recommendations.push({
      priority: 'medium',
      action: 'Acknowledge the alert',
      reason: 'The alert is still pending. Consider acknowledging it to indicate you\'re working on it.',
    });
  }

  // Scheduled alerts with SOP
  if (alert.status === 'scheduled' && sopResponse.status === 'in_progress') {
    recommendations.push({
      priority: 'medium',
      action: 'Continue with SOP steps',
      reason: 'Alert is scheduled and SOP is in progress. Continue completing steps.',
    });
  }

  return recommendations;
}

/**
 * Analyze tags for recommendations
 */
async function analyzeTagsForRecommendations(
  recordingId: string,
  sopResponse: any,
  sop: any
): Promise<ActionRecommendation[]> {
  const recommendations: ActionRecommendation[] = [];

  try {
    const tags = await getTagsForRecording(recordingId);
    const tagAnalysis = tags.length > 0 ? await analyzeTags(recordingId) : null;

    if (tagAnalysis) {
      // High risk level
      if (tagAnalysis.riskLevel === 'high' || tagAnalysis.riskLevel === 'critical') {
        recommendations.push({
          priority: 'high',
          action: 'Consider escalation - high risk detected',
          reason: `AI analysis indicates ${tagAnalysis.riskLevel} risk level. Consider escalating to supervisor or emergency services.`,
        });
      }

      // Distressed/agitated tone
      const distressedTone = tagAnalysis.insights.find(
        (i: any) => i.title.includes('Distressed') || i.title.includes('Agitated')
      );
      if (distressedTone) {
        recommendations.push({
          priority: 'high',
          action: 'Provide additional support - client appears distressed',
          reason: distressedTone.message,
        });
      }

      // Fall detected
      const fallDetected = tagAnalysis.insights.find((i: any) => i.title.includes('Fall'));
      if (fallDetected) {
        recommendations.push({
          priority: 'high',
          action: 'Verify client safety - fall detected',
          reason: 'A fall was mentioned in the conversation. Verify client safety and consider medical assessment.',
        });
      }

      // Emergency keywords
      const emergencyTags = tags.filter((t: any) => 
        t.tagType === 'risk_word' && 
        ['emergency', 'ambulance', 'hospital', '911'].includes(t.tagValue)
      );
      if (emergencyTags.length > 0) {
        recommendations.push({
          priority: 'high',
          action: 'URGENT: Emergency situation detected',
          reason: 'Emergency-related keywords detected in conversation. Immediate action may be required.',
        });
      }
    }
  } catch (error) {
    console.error('Failed to analyze tags for recommendations:', error);
  }

  return recommendations;
}

/**
 * Identify the next step to complete
 */
function identifyNextStep(
  sop: any,
  sopResponse: any,
  recommendations: ActionRecommendation[]
): { stepNumber: number; action: string; reason: string } | undefined {
  // Find recommendation for next step
  const nextStepRec = recommendations.find(r => r.stepNumber !== undefined);
  if (nextStepRec && nextStepRec.stepNumber) {
    return {
      stepNumber: nextStepRec.stepNumber,
      action: nextStepRec.stepAction || `Step ${nextStepRec.stepNumber}`,
      reason: nextStepRec.reason,
    };
  }

  return undefined;
}

/**
 * Generate recommendation summary
 */
function generateRecommendationSummary(
  recommendations: ActionRecommendation[],
  nextStep: { stepNumber: number; action: string; reason: string } | undefined,
  urgentActions: ActionRecommendation[],
  remainingSteps: number
): string {
  if (recommendations.length === 0) {
    return 'No specific recommendations at this time. Continue with the SOP steps.';
  }

  let summary = '';

  if (urgentActions.length > 0) {
    summary += `⚠️ **${urgentActions.length} urgent action${urgentActions.length > 1 ? 's' : ''}** require immediate attention:\n\n`;
    urgentActions.forEach((action, index) => {
      summary += `${index + 1}. **${action.action}**\n   ${action.reason}\n\n`;
    });
  }

  if (nextStep) {
    summary += `**Next Step:** Step ${nextStep.stepNumber} - ${nextStep.action}\n`;
    summary += `${nextStep.reason}\n\n`;
  }

  if (remainingSteps > 0) {
    summary += `**Progress:** ${remainingSteps} step${remainingSteps > 1 ? 's' : ''} remaining to complete the SOP.\n\n`;
  }

  if (recommendations.length > urgentActions.length) {
    summary += `**Additional Recommendations:**\n`;
    recommendations
      .filter(r => r.priority !== 'high')
      .slice(0, 3)
      .forEach((rec, index) => {
        summary += `${index + 1}. ${rec.action}\n`;
      });
  }

  return summary.trim();
}

