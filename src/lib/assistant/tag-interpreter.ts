/**
 * Tag Interpreter Service
 * 
 * Analyzes Gemini-generated tags to provide insights and summaries
 */

import { getTagsForRecording, getTagsByType } from '@/lib/gemini/tag-generator';
// Note: getTranscript is only used server-side, imported dynamically when needed

export interface TagInsight {
  type: 'summary' | 'warning' | 'recommendation' | 'observation';
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface TagAnalysis {
  insights: TagInsight[];
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFindings: string[];
}

/**
 * Analyze tags for a recording and generate insights
 */
export async function analyzeTags(recordingId: string): Promise<TagAnalysis> {
  try {
    // Get all tags for the recording
    const allTags = await getTagsForRecording(recordingId);
    
    if (allTags.length === 0) {
      return {
        insights: [],
        summary: 'No tags available for this recording.',
        riskLevel: 'low',
        keyFindings: [],
      };
    }

    // Get tags by type
    const toneTags = allTags.filter(t => t.tagType === 'tone');
    const motionTags = allTags.filter(t => t.tagType === 'motion');
    const riskTags = allTags.filter(t => t.tagType === 'risk_word');
    const keywordTags = allTags.filter(t => t.tagType === 'keyword');

    // Generate insights
    const insights: TagInsight[] = [];

    // Analyze tone
    const toneInsight = analyzeTone(toneTags);
    if (toneInsight) insights.push(toneInsight);

    // Analyze motion
    const motionInsight = analyzeMotion(motionTags);
    if (motionInsight) insights.push(motionInsight);

    // Analyze risk words
    const riskInsights = analyzeRiskWords(riskTags);
    insights.push(...riskInsights);

    // Analyze keywords
    const keywordInsight = analyzeKeywords(keywordTags);
    if (keywordInsight) insights.push(keywordInsight);

    // Calculate overall risk level
    const riskLevel = calculateRiskLevel(allTags, insights);

    // Generate summary
    const summary = generateSummary(allTags, insights, riskLevel);

    // Extract key findings
    const keyFindings = extractKeyFindings(insights, allTags);

    return {
      insights,
      summary,
      riskLevel,
      keyFindings,
    };
  } catch (error) {
    console.error('Tag analysis error:', error);
    return {
      insights: [],
      summary: 'Failed to analyze tags.',
      riskLevel: 'low',
      keyFindings: [],
    };
  }
}

/**
 * Analyze tone tags
 */
function analyzeTone(tags: any[]): TagInsight | null {
  if (tags.length === 0) return null;

  const toneValues = tags.map(t => t.tagValue);
  const hasAgitated = toneValues.some(v => ['agitated', 'frustrated', 'angry'].includes(v));
  const hasDistressed = toneValues.some(v => ['distressed', 'worried', 'anxious', 'panicked'].includes(v));
  const hasCalm = toneValues.some(v => ['calm', 'relaxed', 'peaceful'].includes(v));

  if (hasDistressed) {
    return {
      type: 'warning',
      title: 'Distressed Client Detected',
      message: 'Client appears distressed, worried, or anxious. Consider providing additional support and reassurance.',
      severity: 'high',
      tags: toneValues,
    };
  }

  if (hasAgitated) {
    return {
      type: 'warning',
      title: 'Agitated Client Detected',
      message: 'Client appears agitated or frustrated. Approach with care and patience.',
      severity: 'medium',
      tags: toneValues,
    };
  }

  if (hasCalm) {
    return {
      type: 'observation',
      title: 'Calm Client Interaction',
      message: 'Client maintained a calm and composed tone throughout the conversation.',
      severity: 'low',
      tags: toneValues,
    };
  }

  return {
    type: 'observation',
    title: 'Tone Analysis',
    message: `Detected tones: ${toneValues.join(', ')}`,
    severity: 'low',
    tags: toneValues,
  };
}

/**
 * Analyze motion tags
 */
function analyzeMotion(tags: any[]): TagInsight | null {
  if (tags.length === 0) return null;

  const motionValues = tags.map(t => t.tagValue);
  const hasFall = motionValues.includes('fall') || motionValues.includes('fell');

  if (hasFall) {
    return {
      type: 'warning',
      title: 'Fall Detected',
      message: 'Fall or falling motion was mentioned. This may require immediate attention and medical assessment.',
      severity: 'high',
      tags: motionValues,
    };
  }

  return {
    type: 'observation',
    title: 'Motion Detected',
    message: `Motion keywords: ${motionValues.join(', ')}`,
    severity: 'low',
    tags: motionValues,
  };
}

/**
 * Analyze risk words
 */
function analyzeRiskWords(tags: any[]): TagInsight[] {
  const insights: TagInsight[] = [];

  if (tags.length === 0) return insights;

  const riskValues = tags.map(t => t.tagValue);
  const criticalWords = ['emergency', 'ambulance', 'hospital', '911'];
  const medicalWords = ['pain', 'injury', 'medication', 'medical'];
  const hasCritical = riskValues.some(v => criticalWords.includes(v));
  const hasMedical = riskValues.some(v => medicalWords.includes(v));

  if (hasCritical) {
    insights.push({
      type: 'warning',
      title: 'Critical Risk Indicators',
      message: 'Emergency-related keywords detected. This may require immediate escalation or emergency services.',
      severity: 'high',
      tags: riskValues.filter(v => criticalWords.includes(v)),
    });
  }

  if (hasMedical) {
    insights.push({
      type: 'warning',
      title: 'Medical Terms Detected',
      message: 'Medical terminology or health-related keywords mentioned. Consider medical assessment.',
      severity: 'high',
      tags: riskValues.filter(v => medicalWords.includes(v)),
    });
  }

  if (tags.length > 3 && !hasCritical && !hasMedical) {
    insights.push({
      type: 'observation',
      title: 'Multiple Risk Words',
      message: `Multiple risk-related keywords detected: ${riskValues.join(', ')}. Monitor situation closely.`,
      severity: 'medium',
      tags: riskValues,
    });
  }

  return insights;
}

/**
 * Analyze keywords
 */
function analyzeKeywords(tags: any[]): TagInsight | null {
  if (tags.length === 0) return null;

  const keywordValues = tags.map(t => t.tagValue);
  const hasFalseAlarm = keywordValues.some(v => v.includes('false alarm'));
  const hasResolved = keywordValues.some(v => v.includes('resolved'));
  const hasEscalated = keywordValues.some(v => v.includes('escalat'));

  if (hasFalseAlarm) {
    return {
      type: 'summary',
      title: 'False Alarm Confirmed',
      message: 'False alarm was mentioned. Situation may not require further action.',
      severity: 'low',
      tags: keywordValues.filter(v => v.includes('false alarm')),
    };
  }

  if (hasResolved) {
    return {
      type: 'summary',
      title: 'Issue Resolved',
      message: 'Resolution mentioned. Verify completion and document appropriately.',
      severity: 'low',
      tags: keywordValues.filter(v => v.includes('resolved')),
    };
  }

  if (hasEscalated) {
    return {
      type: 'warning',
      title: 'Escalation Mentioned',
      message: 'Escalation was mentioned. Check escalation status and follow-up procedures.',
      severity: 'medium',
      tags: keywordValues.filter(v => v.includes('escalat')),
    };
  }

  return {
    type: 'observation',
    title: 'Key Phrases',
    message: `Important keywords: ${keywordValues.join(', ')}`,
    severity: 'low',
    tags: keywordValues,
  };
}

/**
 * Calculate overall risk level
 */
function calculateRiskLevel(allTags: any[], insights: TagInsight[]): 'low' | 'medium' | 'high' | 'critical' {
  // Check for critical insights
  if (insights.some(i => i.severity === 'high')) {
    return 'high';
  }

  // Count high severity insights
  const highSeverityCount = insights.filter(i => i.severity === 'high').length;
  if (highSeverityCount >= 2) {
    return 'high';
  }

  // Check risk word count
  const riskWordCount = allTags.filter(t => t.tagType === 'risk_word').length;
  if (riskWordCount >= 3) {
    return 'high';
  }

  // Check for high severity single insight
  if (insights.some(i => i.severity === 'high')) {
    return 'high';
  }

  // Check for medium severity
  if (insights.some(i => i.severity === 'medium') || riskWordCount >= 1) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generate summary from tags and insights
 */
function generateSummary(
  allTags: any[],
  insights: TagInsight[],
  riskLevel: string
): string {
  const parts: string[] = [];

  parts.push(`Analysis of ${allTags.length} tags indicates a ${riskLevel} risk level.`);

  if (insights.length > 0) {
    const criticalInsights = insights.filter(i => i.severity === 'high');
    if (criticalInsights.length > 0) {
      parts.push(`Key concerns: ${criticalInsights.map(i => i.title).join(', ')}.`);
    }
  }

  const toneTags = allTags.filter(t => t.tagType === 'tone');
  if (toneTags.length > 0) {
    const tones = toneTags.map(t => t.tagValue).join(', ');
    parts.push(`Client tone: ${tones}.`);
  }

  const riskTags = allTags.filter(t => t.tagType === 'risk_word');
  if (riskTags.length > 0) {
    parts.push(`${riskTags.length} risk-related keywords detected.`);
  }

  return parts.join(' ');
}

/**
 * Extract key findings
 */
function extractKeyFindings(insights: TagInsight[], allTags: any[]): string[] {
  const findings: string[] = [];

  // Add high/critical severity insights
  const criticalFindings = insights
    .filter(i => i.severity === 'high')
    .map(i => i.title);
  findings.push(...criticalFindings);

  // Add unique risk words
  const riskWords = [...new Set(allTags.filter(t => t.tagType === 'risk_word').map(t => t.tagValue))];
  if (riskWords.length > 0) {
    findings.push(`Risk words: ${riskWords.join(', ')}`);
  }

  // Add important keywords
  const keywords = allTags.filter(t => t.tagType === 'keyword').map(t => t.tagValue);
  if (keywords.length > 0 && keywords.length <= 5) {
    findings.push(`Keywords: ${keywords.join(', ')}`);
  }

  return findings;
}

/**
 * Get tag-based summary for assistant
 */
export async function getTagSummary(recordingId: string): Promise<string> {
  const analysis = await analyzeTags(recordingId);
  return analysis.summary;
}

/**
 * Get tag insights for display
 */
export async function getTagInsights(recordingId: string): Promise<TagInsight[]> {
  const analysis = await analyzeTags(recordingId);
  return analysis.insights;
}

