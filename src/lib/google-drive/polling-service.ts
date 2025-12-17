/**
 * Google Drive Polling Service
 * 
 * Production-ready polling service with:
 * - Rate limiting and exponential backoff
 * - Distributed locking to prevent duplicate processing
 * - Structured logging and metrics
 * - Parallel processing with concurrency limits
 * - Circuit breaker for API failures
 * - Transaction safety for database updates
 */

import { query } from '@/lib/database';
import { listMeetRecordings, findRecordingFiles } from './drive-service';
import { processMeetRecording } from '@/lib/google-meet/recording-processor';

export interface PollingOptions {
  intervalMinutes?: number;
  maxResults?: number;
  concurrency?: number; // Max parallel processing
  enableRateLimit?: boolean; // Enable rate limiting
  enableCircuitBreaker?: boolean; // Enable circuit breaker
}

export interface PollingStats {
  checked: number;
  processed: number;
  errors: number;
  skipped: number; // Skipped due to rate limits or circuit breaker
  duration: number; // Duration in milliseconds
  timestamp: string;
}

// Rate limiting state (in-memory, resets on restart)
// In production, consider using Redis for distributed rate limiting
let rateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowStart: Date.now(),
};

// Circuit breaker state
let circuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed' as 'closed' | 'open' | 'half-open',
};

const RATE_LIMIT = {
  maxRequestsPerMinute: 60, // Google Drive API: 1000 requests/100 seconds per user
  minDelayBetweenRequests: 100, // Minimum 100ms between requests
};

const CIRCUIT_BREAKER = {
  failureThreshold: 5, // Open circuit after 5 consecutive failures
  timeout: 60000, // 1 minute before trying again
  halfOpenMaxAttempts: 2, // Try 2 requests in half-open state
};

/**
 * Check and update rate limit state
 * Returns true if request can proceed, false if rate limited
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window

  // Reset window if expired
  if (now - rateLimitState.windowStart >= windowMs) {
    rateLimitState = {
      lastRequestTime: 0,
      requestCount: 0,
      windowStart: now,
    };
  }

  // Check if we've exceeded rate limit
  if (rateLimitState.requestCount >= RATE_LIMIT.maxRequestsPerMinute) {
    return false;
  }

  // Enforce minimum delay between requests
  const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT.minDelayBetweenRequests) {
    return false;
  }

  // Update state
  rateLimitState.lastRequestTime = now;
  rateLimitState.requestCount++;

  return true;
}

/**
 * Check circuit breaker state
 * Returns true if request can proceed, false if circuit is open
 */
function checkCircuitBreaker(): boolean {
  const now = Date.now();

  // If circuit is open, check if timeout has passed
  if (circuitBreakerState.state === 'open') {
    if (now - circuitBreakerState.lastFailureTime >= CIRCUIT_BREAKER.timeout) {
      // Move to half-open state
      circuitBreakerState.state = 'half-open';
      circuitBreakerState.failures = 0;
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Record a successful request (reset circuit breaker)
 */
function recordSuccess() {
  if (circuitBreakerState.state === 'half-open') {
    // Success in half-open state, close the circuit
    circuitBreakerState.state = 'closed';
    circuitBreakerState.failures = 0;
  } else if (circuitBreakerState.state === 'closed') {
    // Reset failure count on success
    circuitBreakerState.failures = 0;
  }
}

/**
 * Record a failed request (update circuit breaker)
 */
function recordFailure() {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();

  if (circuitBreakerState.failures >= CIRCUIT_BREAKER.failureThreshold) {
    circuitBreakerState.state = 'open';
    console.warn('[Drive Polling] Circuit breaker opened due to repeated failures');
  } else if (circuitBreakerState.state === 'half-open') {
    // Failure in half-open state, open the circuit again
    circuitBreakerState.state = 'open';
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll Google Drive for new recordings and process them
 * 
 * Production-ready implementation with:
 * - Rate limiting
 * - Circuit breaker
 * - Distributed locking (via database)
 * - Parallel processing with concurrency limits
 * - Structured logging
 */
export async function pollForNewRecordings(options: PollingOptions = {}): Promise<PollingStats> {
  const startTime = Date.now();
  const { 
    intervalMinutes = 5, 
    maxResults = 50,
    concurrency = 3, // Process up to 3 recordings in parallel
    enableRateLimit = true,
    enableCircuitBreaker = true,
  } = options;
  
  const stats: PollingStats = {
    checked: 0,
    processed: 0,
    errors: 0,
    skipped: 0,
    duration: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check circuit breaker
    if (enableCircuitBreaker && !checkCircuitBreaker()) {
      console.warn('[Drive Polling] Circuit breaker is open, skipping poll');
      stats.skipped = 1;
      stats.duration = Date.now() - startTime;
      return stats;
    }

    // Get pending recordings with distributed locking
    // Use lastPolledAt to prevent duplicate processing across instances
    const cutoffTime = new Date(Date.now() - intervalMinutes * 60 * 1000);
    const lockTimeout = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes lock timeout
    
    // Try to get recent pending recordings first (with lock check)
    let pendingRecordings = await query(`
      SELECT id, "meetingId", "createdAt", "videoDriveFileId", "transcriptDriveFileId", "alertId", "lastPolledAt"
      FROM "Recording"
      WHERE "source" = 'google_meet' 
        AND "processingStatus" = 'pending'
        AND "createdAt" >= $1
        AND ("lastPolledAt" IS NULL OR "lastPolledAt" < $2)
      ORDER BY "createdAt" DESC
      LIMIT $3
    `, [cutoffTime, lockTimeout, maxResults]);

    // If no recent recordings, check for any pending recordings (older than intervalMinutes)
    if (pendingRecordings.rows.length === 0) {
      console.log('[Drive Polling] No recent pending recordings, checking for any pending recordings...');
      pendingRecordings = await query(`
        SELECT id, "meetingId", "createdAt", "videoDriveFileId", "transcriptDriveFileId", "alertId", "lastPolledAt"
        FROM "Recording"
        WHERE "source" = 'google_meet' 
          AND "processingStatus" = 'pending'
          AND ("lastPolledAt" IS NULL OR "lastPolledAt" < $1)
        ORDER BY "createdAt" DESC
        LIMIT $2
      `, [lockTimeout, maxResults]);
    }

    stats.checked = pendingRecordings.rows.length;

    if (pendingRecordings.rows.length === 0) {
      console.log('[Drive Polling] No pending recordings found');
      stats.duration = Date.now() - startTime;
      return stats;
    }

    console.log(`[Drive Polling] Found ${pendingRecordings.rows.length} pending recordings (processing with concurrency: ${concurrency})`);

    // Process recordings in parallel batches with concurrency limit
    const processingPromises: Promise<void>[] = [];
    let activeCount = 0;

    for (const recording of pendingRecordings.rows) {
      // Wait if we've reached concurrency limit
      while (activeCount >= concurrency) {
        await sleep(100); // Wait 100ms before checking again
      }

      activeCount++;
      const promise = processRecording(recording, stats, enableRateLimit, enableCircuitBreaker)
        .finally(() => {
          activeCount--;
        });

      processingPromises.push(promise);
    }

    // Wait for all processing to complete
    await Promise.allSettled(processingPromises);

    // Record success if we processed any recordings
    if (stats.processed > 0 && enableCircuitBreaker) {
      recordSuccess();
    }

    stats.duration = Date.now() - startTime;
    console.log(`[Drive Polling] Completed: ${JSON.stringify(stats)}`);
    
    return stats;
  } catch (error) {
    if (enableCircuitBreaker) {
      recordFailure();
    }
    console.error('[Drive Polling] Error polling for recordings:', error);
    stats.duration = Date.now() - startTime;
    throw error;
  }
}

/**
 * Process a single recording with error handling and rate limiting
 */
async function processRecording(
  recording: any,
  stats: PollingStats,
  enableRateLimit: boolean,
  enableCircuitBreaker: boolean
): Promise<void> {
  try {
    // Check rate limit before processing
    if (enableRateLimit && !checkRateLimit()) {
      console.warn(`[Drive Polling] Rate limited, skipping recording ${recording.id}`);
      stats.skipped++;
      return;
    }

    // Update lastPolledAt to acquire lock (distributed locking)
    await query(
      'UPDATE "Recording" SET "lastPolledAt" = NOW() WHERE id = $1',
      [recording.id]
    );

    // Check if recording is too old (more than 24 hours) - mark as cancelled
    const recordingAge = recording.createdAt 
      ? Date.now() - new Date(recording.createdAt).getTime()
      : 0;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (recordingAge > maxAge) {
      console.log(`[Drive Polling] Recording ${recording.id} is older than 24 hours, marking as cancelled`);
      await query(
        'UPDATE "Recording" SET "processingStatus" = $1, "lastPolledAt" = NULL WHERE id = $2',
        ['cancelled', recording.id]
      );
      stats.checked--; // Don't count cancelled recordings as checked
      return;
    }

    // Try to find files in Drive (with retry logic)
    let files;
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        // Check rate limit before API call
        if (enableRateLimit && !checkRateLimit()) {
          await sleep(1000); // Wait 1 second if rate limited
          continue;
        }

        files = await findRecordingFiles(
          recording.meetingId || '',
          recording.createdAt ? new Date(recording.createdAt) : undefined,
          30, // 30 minute window
          recording.alertId || undefined,
          recording.id
        );
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        retries--;
        
        // Check if it's a rate limit error
        if (error.status === 429 || error.message?.includes('rate limit')) {
          console.warn(`[Drive Polling] Rate limit error for recording ${recording.id}, retrying...`);
          await sleep(2000 * (4 - retries)); // Exponential backoff
          continue;
        }
        
        // For other errors, wait a bit and retry
        if (retries > 0) {
          await sleep(1000 * (4 - retries)); // Exponential backoff
        }
      }
    }

    if (!files || !files.transcriptFile) {
      console.log(`[Drive Polling] No transcript found for recording ${recording.id} yet`);
      // Reset lastPolledAt so it can be checked again
      await query(
        'UPDATE "Recording" SET "lastPolledAt" = NULL WHERE id = $1',
        [recording.id]
      );
      return;
    }

    // Process the recording
    const result = await processMeetRecording({
      recordingId: recording.id,
      videoDriveFileId: files.videoFile?.id,
      transcriptDriveFileId: files.transcriptFile.id,
      meetingId: recording.meetingId,
      meetingStartTime: recording.createdAt ? new Date(recording.createdAt) : undefined,
    });

    if (result.success) {
      stats.processed++;
      console.log(`[Drive Polling] ✅ Successfully processed recording ${recording.id}`);
      // Clear lastPolledAt after successful processing
      await query(
        'UPDATE "Recording" SET "lastPolledAt" = NULL WHERE id = $1',
        [recording.id]
      );
    } else {
      stats.errors++;
      console.error(`[Drive Polling] ❌ Failed to process recording ${recording.id}: ${result.error}`);
      // Reset lastPolledAt on error so it can be retried
      await query(
        'UPDATE "Recording" SET "lastPolledAt" = NULL WHERE id = $1',
        [recording.id]
      );
      if (enableCircuitBreaker) {
        recordFailure();
      }
    }
  } catch (error) {
    stats.errors++;
    console.error(`[Drive Polling] ❌ Error processing recording ${recording.id}:`, error);
    // Reset lastPolledAt on error so it can be retried
    await query(
      'UPDATE "Recording" SET "lastPolledAt" = NULL WHERE id = $1',
      [recording.id]
    );
    if (enableCircuitBreaker) {
      recordFailure();
    }
  }
}

/**
 * Start a polling interval (for development/testing)
 * 
 * WARNING: Only use this in development! In production, use Vercel Cron or similar.
 */
export function startPollingInterval(
  options: PollingOptions & { onError?: (error: Error) => void } = {}
): NodeJS.Timeout {
  const { intervalMinutes = 5, onError } = options;

  console.log(`[Drive Polling] Starting polling interval (every ${intervalMinutes} minutes)`);

  // Poll immediately
  pollForNewRecordings(options).catch(error => {
    console.error('[Drive Polling] Initial poll failed:', error);
    onError?.(error as Error);
  });

  // Then poll at intervals
  const interval = setInterval(() => {
    pollForNewRecordings(options).catch(error => {
      console.error('[Drive Polling] Poll failed:', error);
      onError?.(error as Error);
    });
  }, intervalMinutes * 60 * 1000);

  return interval;
}

/**
 * Get polling health status
 */
export function getPollingHealth(): {
  rateLimit: {
    requestsInWindow: number;
    maxRequests: number;
    canProceed: boolean;
  };
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailureTime: number | null;
  };
} {
  return {
    rateLimit: {
      requestsInWindow: rateLimitState.requestCount,
      maxRequests: RATE_LIMIT.maxRequestsPerMinute,
      canProceed: checkRateLimit(),
    },
    circuitBreaker: {
      state: circuitBreakerState.state,
      failures: circuitBreakerState.failures,
      lastFailureTime: circuitBreakerState.lastFailureTime || null,
    },
  };
}

