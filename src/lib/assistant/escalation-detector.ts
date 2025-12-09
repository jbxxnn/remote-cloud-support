/**
 * Escalation Detector
 * 
 * Analyzes tags, transcripts, and context to detect potential incidents
 * that may require escalation to supervisors or emergency services.
 */

import { analyzeTags, TagAnalysis } from './tag-interpreter';
import { getTagsForRecording } from '@/lib/gemini/tag-generator';
import { getTranscript } from '@/lib/gemini/transcription-service';

export interface EscalationIndicator {
  type: 'keyword' | 'tone' | 'motion' | 'risk_word' | 'medical' | 'emergency' | 'pattern';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  context?: string;
}

export interface EscalationResult {
  shouldEscalate: boolean;
  escalationScore: number; // 0-100
  escalationLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  indicators: EscalationIndicator[];
  reasons: string[];
  recommendedAction: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detect potential escalation for an alert/recording
 */
export async function detectEscalation(
  alertId: string,
  recordingId?: string
): Promise<EscalationResult> {
  const indicators: EscalationIndicator[] = [];
  const reasons: string[] = [];
  let escalationScore = 0;

  // If we have a recording, analyze tags and transcript
  if (recordingId && typeof window === 'undefined') {
    try {
      const tags = await getTagsForRecording(recordingId);
      const tagAnalysis = tags.length > 0 ? await analyzeTags(recordingId) : null;
      const transcript = await getTranscript(recordingId);

      if (tagAnalysis) {
        // Analyze risk level
        if (tagAnalysis.riskLevel === 'critical') {
          escalationScore += 40;
          indicators.push({
            type: 'pattern',
            value: 'critical_risk_level',
            severity: 'critical',
            confidence: 0.9,
            context: 'Overall risk level is critical',
          });
          reasons.push('Critical risk level detected from AI analysis');
        } else if (tagAnalysis.riskLevel === 'high') {
          escalationScore += 25;
          indicators.push({
            type: 'pattern',
            value: 'high_risk_level',
            severity: 'high',
            confidence: 0.8,
            context: 'Overall risk level is high',
          });
          reasons.push('High risk level detected from AI analysis');
        }

        // Check for critical insights
        const criticalInsights = tagAnalysis.insights.filter(
          (i: any) => i.severity === 'critical'
        );
        if (criticalInsights.length > 0) {
          escalationScore += criticalInsights.length * 15;
          criticalInsights.forEach((insight: any) => {
            indicators.push({
              type: 'pattern',
              value: insight.title.toLowerCase().replace(/\s+/g, '_'),
              severity: 'critical',
              confidence: 0.85,
              context: insight.message,
            });
            reasons.push(`Critical insight: ${insight.title}`);
          });
        }

        // Analyze tone tags
        const toneTags = tags.filter((t: any) => t.tagType === 'tone');
        const distressedTones = toneTags.filter((t: any) =>
          ['distressed', 'agitated', 'panicked', 'frightened'].includes(t.tagValue)
        );
        if (distressedTones.length > 0) {
          escalationScore += distressedTones.length * 10;
          distressedTones.forEach((tag: any) => {
            indicators.push({
              type: 'tone',
              value: tag.tagValue,
              severity: tag.tagValue === 'panicked' || tag.tagValue === 'frightened' ? 'critical' : 'high',
              confidence: tag.confidence || 0.7,
              context: tag.context,
            });
            reasons.push(`Distressed tone detected: ${tag.tagValue}`);
          });
        }

        // Analyze risk words
        const riskWords = tags.filter((t: any) => t.tagType === 'risk_word');
        const criticalRiskWords = riskWords.filter((t: any) =>
          ['emergency', 'ambulance', '911', 'hospital', 'unresponsive', 'injury', 'bleeding'].includes(t.tagValue)
        );
        if (criticalRiskWords.length > 0) {
          escalationScore += criticalRiskWords.length * 20;
          criticalRiskWords.forEach((tag: any) => {
            indicators.push({
              type: 'risk_word',
              value: tag.tagValue,
              severity: 'critical',
              confidence: tag.confidence || 0.8,
              context: tag.context,
            });
            reasons.push(`Critical risk word detected: ${tag.tagValue}`);
          });
        }

        // Analyze motion tags
        const motionTags = tags.filter((t: any) => t.tagType === 'motion');
        const criticalMotions = motionTags.filter((t: any) =>
          ['fall', 'collapse', 'struggle'].includes(t.tagValue)
        );
        if (criticalMotions.length > 0) {
          escalationScore += criticalMotions.length * 25;
          criticalMotions.forEach((tag: any) => {
            indicators.push({
              type: 'motion',
              value: tag.tagValue,
              severity: 'critical',
              confidence: tag.confidence || 0.75,
              context: tag.context,
            });
            reasons.push(`Critical motion detected: ${tag.tagValue}`);
          });
        }

        // Check for medical terminology
        const medicalKeywords = tags.filter((t: any) =>
          t.tagType === 'keyword' &&
          ['medical', 'doctor', 'nurse', 'medication', 'prescription', 'surgery', 'treatment'].includes(t.tagValue)
        );
        if (medicalKeywords.length > 0) {
          escalationScore += medicalKeywords.length * 8;
          medicalKeywords.forEach((tag: any) => {
            indicators.push({
              type: 'medical',
              value: tag.tagValue,
              severity: 'medium',
              confidence: tag.confidence || 0.6,
              context: tag.context,
            });
            reasons.push(`Medical terminology detected: ${tag.tagValue}`);
          });
        }

        // Analyze transcript for emergency phrases
        if (transcript) {
          const emergencyPhrases = detectEmergencyPhrases(transcript.transcriptText);
          if (emergencyPhrases.length > 0) {
            escalationScore += emergencyPhrases.length * 15;
            emergencyPhrases.forEach((phrase: string) => {
              indicators.push({
                type: 'emergency',
                value: phrase,
                severity: 'critical',
                confidence: 0.7,
                context: `Emergency phrase found in transcript: "${phrase}"`,
              });
              reasons.push(`Emergency phrase detected: "${phrase}"`);
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to analyze tags/transcript for escalation:', error);
    }
  }

  // Cap escalation score at 100
  escalationScore = Math.min(escalationScore, 100);

  // Determine escalation level
  let escalationLevel: EscalationResult['escalationLevel'] = 'none';
  let urgency: EscalationResult['urgency'] = 'low';
  let shouldEscalate = false;
  let recommendedAction = 'Continue monitoring. No immediate escalation required.';

  if (escalationScore >= 70) {
    escalationLevel = 'critical';
    urgency = 'critical';
    shouldEscalate = true;
    recommendedAction = 'URGENT: Immediate escalation required. Contact supervisor and/or emergency services if medical emergency is suspected.';
  } else if (escalationScore >= 50) {
    escalationLevel = 'high';
    urgency = 'high';
    shouldEscalate = true;
    recommendedAction = 'High priority escalation recommended. Notify supervisor and monitor closely.';
  } else if (escalationScore >= 30) {
    escalationLevel = 'medium';
    urgency = 'medium';
    shouldEscalate = true;
    recommendedAction = 'Consider escalation to supervisor. Review situation and escalate if conditions worsen.';
  } else if (escalationScore >= 15) {
    escalationLevel = 'low';
    urgency = 'low';
    shouldEscalate = false;
    recommendedAction = 'Monitor closely. Escalation may be needed if situation develops.';
  }

  return {
    shouldEscalate,
    escalationScore,
    escalationLevel,
    indicators,
    reasons,
    recommendedAction,
    urgency,
  };
}

/**
 * Detect emergency phrases in transcript text
 */
function detectEmergencyPhrases(text: string): string[] {
  const emergencyPhrases = [
    'call 911',
    'call an ambulance',
    'need emergency help',
    'medical emergency',
    'someone is hurt',
    'can\'t breathe',
    'chest pain',
    'unconscious',
    'not responding',
    'need immediate help',
    'urgent medical attention',
    'life threatening',
  ];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  emergencyPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      found.push(phrase);
    }
  });

  return found;
}

/**
 * Get escalation summary for display
 */
export function getEscalationSummary(result: EscalationResult): string {
  if (!result.shouldEscalate && result.escalationLevel === 'none') {
    return 'No escalation indicators detected. Situation appears stable.';
  }

  let summary = `**Escalation Level:** ${result.escalationLevel.toUpperCase()}\n\n`;
  summary += `**Escalation Score:** ${result.escalationScore}/100\n\n`;
  summary += `**Recommended Action:** ${result.recommendedAction}\n\n`;

  if (result.indicators.length > 0) {
    summary += `**Key Indicators:**\n`;
    result.indicators
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 5)
      .forEach(indicator => {
        summary += `- ${indicator.type.toUpperCase()}: ${indicator.value} (${indicator.severity})\n`;
      });
    summary += `\n`;
  }

  if (result.reasons.length > 0) {
    summary += `**Reasons:**\n`;
    result.reasons.slice(0, 5).forEach((reason, index) => {
      summary += `${index + 1}. ${reason}\n`;
    });
  }

  return summary;
}

