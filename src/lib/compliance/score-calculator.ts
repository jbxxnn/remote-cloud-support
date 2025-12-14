/**
 * Compliance Score Calculator
 * 
 * Calculates provider-wide compliance scores based on:
 * - Validation results
 * - Incident reports
 * - SOP completion rates
 * - Documentation completeness
 */

import { query } from '@/lib/database';

/**
 * Compliance score breakdown
 */
export interface ComplianceScoreBreakdown {
  /** Overall compliance score (0-100) */
  overallScore: number;
  
  /** Validation compliance (0-100) */
  validationScore: number;
  
  /** Incident compliance (0-100) */
  incidentScore: number;
  
  /** SOP compliance (0-100) */
  sopScore: number;
  
  /** Documentation compliance (0-100) */
  documentationScore: number;
  
  /** Breakdown details */
  details: {
    validation: {
      totalValidations: number;
      passedValidations: number;
      failedValidations: number;
      errorRate: number;
    };
    incidents: {
      totalIncidents: number;
      finalizedIncidents: number;
      draftIncidents: number;
      completionRate: number;
    };
    sops: {
      totalSOPResponses: number;
      completedSOPResponses: number;
      completionRate: number;
    };
    documentation: {
      totalRecords: number;
      completeRecords: number;
      completenessRate: number;
    };
  };
  
  /** Timestamp of calculation */
  calculatedAt: string;
  
  /** Date range for calculation */
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Calculate provider-wide compliance score
 */
export async function calculateComplianceScore(
  dateRange?: { start: string; end: string }
): Promise<ComplianceScoreBreakdown> {
  const now = new Date();
  const startDate = dateRange?.start 
    ? new Date(dateRange.start)
    : new Date(now.getFullYear(), now.getMonth() - 1, 1); // Last month
  const endDate = dateRange?.end 
    ? new Date(dateRange.end)
    : now;

  // Calculate validation score
  const validationScore = await calculateValidationScore(startDate, endDate);
  
  // Calculate incident score
  const incidentScore = await calculateIncidentScore(startDate, endDate);
  
  // Calculate SOP score
  const sopScore = await calculateSOPScore(startDate, endDate);
  
  // Calculate documentation score
  const documentationScore = await calculateDocumentationScore(startDate, endDate);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    validationScore.score * 0.35 +
    incidentScore.score * 0.25 +
    sopScore.score * 0.25 +
    documentationScore.score * 0.15
  );

  return {
    overallScore,
    validationScore: validationScore.score,
    incidentScore: incidentScore.score,
    sopScore: sopScore.score,
    documentationScore: documentationScore.score,
    details: {
      validation: validationScore.details,
      incidents: incidentScore.details,
      sops: sopScore.details,
      documentation: documentationScore.details,
    },
    calculatedAt: now.toISOString(),
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}

/**
 * Calculate validation compliance score
 */
async function calculateValidationScore(
  startDate: Date,
  endDate: Date
): Promise<{ score: number; details: any }> {
  // Note: This assumes validation results are stored somewhere
  // For now, we'll calculate based on SOP responses and incidents
  
  // Get SOP responses with validation status
  const sopResponsesResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "SOPResponse"
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const totalSOPResponses = parseInt(sopResponsesResult.rows[0]?.total || '0');

  // Get completed SOP responses (status = 'completed')
  const completedSOPResponsesResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "SOPResponse"
    WHERE status = 'completed'
    AND "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const completedSOPResponses = parseInt(completedSOPResponsesResult.rows[0]?.total || '0');

  // Calculate score based on completion rate
  // Assume completed SOPs are validated
  const passedValidations = completedSOPResponses;
  const failedValidations = totalSOPResponses - completedSOPResponses;
  const errorRate = totalSOPResponses > 0 
    ? (failedValidations / totalSOPResponses) * 100 
    : 0;

  // Score: 100 - (error rate * 2) to penalize errors more
  const score = Math.max(0, Math.min(100, 100 - (errorRate * 2)));

  return {
    score: Math.round(score),
    details: {
      totalValidations: totalSOPResponses,
      passedValidations,
      failedValidations,
      errorRate: Math.round(errorRate * 100) / 100,
    },
  };
}

/**
 * Calculate incident compliance score
 */
async function calculateIncidentScore(
  startDate: Date,
  endDate: Date
): Promise<{ score: number; details: any }> {
  // Get total incidents
  const totalIncidentsResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "Incident"
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const totalIncidents = parseInt(totalIncidentsResult.rows[0]?.total || '0');

  // Get finalized incidents
  const finalizedIncidentsResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "Incident"
    WHERE status IN ('finalized', 'locked')
    AND "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const finalizedIncidents = parseInt(finalizedIncidentsResult.rows[0]?.total || '0');

  // Get draft incidents
  const draftIncidentsResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "Incident"
    WHERE status = 'draft'
    AND "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const draftIncidents = parseInt(draftIncidentsResult.rows[0]?.total || '0');

  // Calculate completion rate
  const completionRate = totalIncidents > 0 
    ? (finalizedIncidents / totalIncidents) * 100 
    : 100; // 100% if no incidents (no compliance issues)

  return {
    score: Math.round(completionRate),
    details: {
      totalIncidents,
      finalizedIncidents,
      draftIncidents,
      completionRate: Math.round(completionRate * 100) / 100,
    },
  };
}

/**
 * Calculate SOP compliance score
 */
async function calculateSOPScore(
  startDate: Date,
  endDate: Date
): Promise<{ score: number; details: any }> {
  // Get total SOP responses
  const totalSOPResponsesResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "SOPResponse"
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const totalSOPResponses = parseInt(totalSOPResponsesResult.rows[0]?.total || '0');

  // Get completed SOP responses
  const completedSOPResponsesResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "SOPResponse"
    WHERE status = 'completed'
    AND "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const completedSOPResponses = parseInt(completedSOPResponsesResult.rows[0]?.total || '0');

  // Calculate completion rate
  const completionRate = totalSOPResponses > 0 
    ? (completedSOPResponses / totalSOPResponses) * 100 
    : 100; // 100% if no SOPs (no compliance issues)

  return {
    score: Math.round(completionRate),
    details: {
      totalSOPResponses,
      completedSOPResponses,
      completionRate: Math.round(completionRate * 100) / 100,
    },
  };
}

/**
 * Calculate documentation compliance score
 */
async function calculateDocumentationScore(
  startDate: Date,
  endDate: Date
): Promise<{ score: number; details: any }> {
  // Get total records (SOP responses + incidents)
  const sopResponsesResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "SOPResponse"
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const incidentsResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "Incident"
    WHERE "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const totalRecords = 
    parseInt(sopResponsesResult.rows[0]?.total || '0') +
    parseInt(incidentsResult.rows[0]?.total || '0');

  // Get complete records (completed SOPs + finalized incidents)
  const completedSOPsResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "SOPResponse"
    WHERE status = 'completed'
    AND "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const finalizedIncidentsResult = await query(
    `
    SELECT COUNT(*) as total
    FROM "Incident"
    WHERE status IN ('finalized', 'locked')
    AND "createdAt" >= $1 AND "createdAt" <= $2
  `,
    [startDate, endDate]
  );

  const completeRecords = 
    parseInt(completedSOPsResult.rows[0]?.total || '0') +
    parseInt(finalizedIncidentsResult.rows[0]?.total || '0');

  // Calculate completeness rate
  const completenessRate = totalRecords > 0 
    ? (completeRecords / totalRecords) * 100 
    : 100; // 100% if no records (no compliance issues)

  return {
    score: Math.round(completenessRate),
    details: {
      totalRecords,
      completeRecords,
      completenessRate: Math.round(completenessRate * 100) / 100,
    },
  };
}

/**
 * Get historical compliance scores
 */
export async function getHistoricalScores(
  days: number = 30
): Promise<Array<{ date: string; score: number }>> {
  const scores: Array<{ date: string; score: number }> = [];
  const now = new Date();

  // Calculate daily scores for the last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const scoreData = await calculateComplianceScore({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    scores.push({
      date: date.toISOString().split('T')[0],
      score: scoreData.overallScore,
    });
  }

  return scores;
}



