/**
 * Incident Finalizer Service
 * 
 * Handles finalization of incidents, including:
 * - Locking incident data
 * - Generating final packet
 * - Creating checksum for integrity
 * - Storing finalized data
 */

import crypto from 'crypto';
import { query } from '@/lib/database';
import type { MUIDraftData } from './mui-drafter';

/**
 * Finalized incident packet structure
 */
export interface FinalizedIncidentPacket {
  /** Incident ID */
  incidentId: string;
  
  /** Finalized timestamp */
  finalizedAt: string;
  
  /** User who finalized */
  finalizedBy: string;
  
  /** Finalized data (locked snapshot) */
  data: MUIDraftData;
  
  /** Checksum for integrity verification */
  checksum: string;
  
  /** Checksum algorithm used */
  checksumAlgorithm: string;
  
  /** Version of the finalization format */
  version: string;
  
  /** Metadata */
  metadata: {
    originalDraftCreatedAt: string;
    originalDraftCreatedBy: string;
    reviewHistory?: Array<{
      reviewedBy: string;
      reviewedAt: string;
      status: string;
    }>;
    validationStatus?: {
      isValid: boolean;
      errors: number;
      warnings: number;
    };
  };
}

/**
 * Finalization result
 */
export interface FinalizationResult {
  /** Whether finalization was successful */
  success: boolean;
  
  /** Finalized incident packet */
  packet: FinalizedIncidentPacket;
  
  /** Error message if finalization failed */
  error?: string;
}

/**
 * Generate checksum for incident data
 */
export function generateChecksum(data: any, algorithm: string = 'sha256'): string {
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash(algorithm);
  hash.update(dataString);
  return hash.digest('hex');
}

/**
 * Verify checksum of finalized incident
 */
export function verifyChecksum(
  data: any,
  expectedChecksum: string,
  algorithm: string = 'sha256'
): boolean {
  const calculatedChecksum = generateChecksum(data, algorithm);
  return calculatedChecksum === expectedChecksum;
}

/**
 * Generate finalized incident packet
 */
export async function generateFinalizedPacket(
  incidentId: string,
  finalizedBy: string
): Promise<FinalizedIncidentPacket> {
  // Fetch incident with all related data
  const incidentResult = await query(
    `
    SELECT
      i.*,
      a.message as "alertMessage",
      c.name as "clientName",
      u1.name as "createdByName",
      u2.name as "reviewedByName",
      u3.name as "finalizedByName"
    FROM "Incident" i
    LEFT JOIN "Alert" a ON i."alertId" = a.id
    LEFT JOIN "Client" c ON i."clientId" = c.id
    LEFT JOIN "User" u1 ON i."createdBy" = u1.id
    LEFT JOIN "User" u2 ON i."reviewedBy" = u2.id
    LEFT JOIN "User" u3 ON i."finalizedBy" = u3.id
    WHERE i.id = $1
  `,
    [incidentId]
  );

  if (incidentResult.rows.length === 0) {
    throw new Error('Incident not found');
  }

  const incident = incidentResult.rows[0];

  // Ensure we're using the draft data (or finalized data if already finalized)
  const incidentData = incident.draftData || incident.finalizedData || {};

  // Build finalized packet
  const finalizedData: MUIDraftData = {
    ...incidentData,
    // Ensure all required fields are present
    incidentType: incident.incidentType,
    incidentDate: incidentData.incidentDate || new Date(incident.createdAt).toISOString().split('T')[0],
    incidentTime: incidentData.incidentTime || new Date(incident.createdAt).toTimeString().split(' ')[0],
    client: incidentData.client || {
      id: incident.clientId,
      name: incident.clientName || 'Unknown',
    },
  };

  // Generate checksum
  const checksum = generateChecksum(finalizedData);

  // Build review history if available
  const reviewHistory = [];
  if (incident.reviewedBy && incident.reviewedByName) {
    reviewHistory.push({
      reviewedBy: incident.reviewedByName,
      reviewedAt: incident.updatedAt || incident.createdAt,
      status: 'review',
    });
  }

  // Build metadata
  const metadata = {
    originalDraftCreatedAt: incident.createdAt,
    originalDraftCreatedBy: incident.createdByName || 'Unknown',
    reviewHistory: reviewHistory.length > 0 ? reviewHistory : undefined,
    validationStatus: incidentData.validationResults || undefined,
  };

  const packet: FinalizedIncidentPacket = {
    incidentId,
    finalizedAt: new Date().toISOString(),
    finalizedBy,
    data: finalizedData,
    checksum,
    checksumAlgorithm: 'sha256',
    version: '1.0',
    metadata,
  };

  return packet;
}

/**
 * Finalize an incident
 */
export async function finalizeIncident(
  incidentId: string,
  finalizedBy: string
): Promise<FinalizationResult> {
  try {
    // Check if incident exists and is in a finalizable state
    const incidentResult = await query(
      'SELECT * FROM "Incident" WHERE id = $1',
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      return {
        success: false,
        packet: {} as FinalizedIncidentPacket,
        error: 'Incident not found',
      };
    }

    const incident = incidentResult.rows[0];

    // Check if already finalized/locked
    if (incident.status === 'finalized' || incident.status === 'locked') {
      return {
        success: false,
        packet: {} as FinalizedIncidentPacket,
        error: 'Incident is already finalized or locked',
      };
    }

    // Check if in review state (should be reviewed before finalization)
    if (incident.status !== 'review' && incident.status !== 'draft') {
      return {
        success: false,
        packet: {} as FinalizedIncidentPacket,
        error: `Cannot finalize incident in ${incident.status} state. Must be in 'review' or 'draft' state.`,
      };
    }

    // Generate finalized packet
    const packet = await generateFinalizedPacket(incidentId, finalizedBy);

    // Store finalized data and update status
    const now = new Date();
    await query(
      `
      UPDATE "Incident"
      SET
        status = 'finalized',
        "finalizedData" = $1,
        "finalizedBy" = $2,
        "finalizedAt" = $3,
        "updatedAt" = $3
      WHERE id = $4
    `,
      [JSON.stringify(packet), finalizedBy, now, incidentId]
    );

    return {
      success: true,
      packet,
    };
  } catch (error) {
    console.error('Failed to finalize incident:', error);
    return {
      success: false,
      packet: {} as FinalizedIncidentPacket,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Lock an incident (prevents all further edits)
 */
export async function lockIncident(
  incidentId: string,
  lockedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if incident exists
    const incidentResult = await query(
      'SELECT * FROM "Incident" WHERE id = $1',
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      return {
        success: false,
        error: 'Incident not found',
      };
    }

    const incident = incidentResult.rows[0];

    // Check if already locked
    if (incident.status === 'locked') {
      return {
        success: false,
        error: 'Incident is already locked',
      };
    }

    // Must be finalized before locking
    if (incident.status !== 'finalized') {
      return {
        success: false,
        error: 'Incident must be finalized before it can be locked',
      };
    }

    // Lock the incident
    const now = new Date();
    await query(
      `
      UPDATE "Incident"
      SET
        status = 'locked',
        "updatedAt" = $1
      WHERE id = $2
    `,
      [now, incidentId]
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('Failed to lock incident:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify integrity of finalized incident
 */
export async function verifyIncidentIntegrity(
  incidentId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const incidentResult = await query(
      'SELECT "finalizedData" FROM "Incident" WHERE id = $1',
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      return {
        valid: false,
        error: 'Incident not found',
      };
    }

    const incident = incidentResult.rows[0];

    if (!incident.finalizedData) {
      return {
        valid: false,
        error: 'Incident has no finalized data',
      };
    }

    const packet = incident.finalizedData as FinalizedIncidentPacket;

    // Verify checksum
    const isValid = verifyChecksum(
      packet.data,
      packet.checksum,
      packet.checksumAlgorithm || 'sha256'
    );

    if (!isValid) {
      return {
        valid: false,
        error: 'Checksum verification failed. Data may have been tampered with.',
      };
    }

    return {
      valid: true,
    };
  } catch (error) {
    console.error('Failed to verify incident integrity:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}



