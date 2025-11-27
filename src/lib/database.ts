import { Pool, PoolClient } from 'pg';

// Database connection pool with improved configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Increased to 30 seconds for better reliability
  statement_timeout: 30000, // Query timeout of 30 seconds
  query_timeout: 30000, // Overall query timeout
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds
});

// Connection event handlers
pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.on('error', (err, client) => {
  // Don't exit the process - this is problematic in Next.js
  // Instead, log the error and let the pool handle reconnection
  console.error('Unexpected error on idle database client', err);
  // The pool will automatically remove the bad client and create a new one
});

pool.on('remove', (client) => {
  console.log('Database client removed from pool');
});

// Helper function to get a client from the pool with retry logic
export async function getClient(retries: number = 3): Promise<PoolClient> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      return client;
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      const isTimeoutError = 
        error?.message?.includes('timeout') || 
        error?.message?.includes('Connection terminated') ||
        error?.code === 'ETIMEDOUT';

      if (isTimeoutError && !isLastAttempt) {
        // Exponential backoff: wait 1s, 2s, 4s between retries
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(
          `Database connection attempt ${attempt} failed (timeout). Retrying in ${waitTime}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // If it's the last attempt or not a timeout error, throw
      console.error(`Failed to get database client after ${attempt} attempt(s):`, error);
      throw error;
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw new Error('Failed to get database client after all retries');
}

// Helper function to execute a query with retry logic
export async function query(text: string, params?: any[], retries: number = 2): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      const isConnectionError = 
        error?.message?.includes('Connection terminated') ||
        error?.message?.includes('timeout') ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNRESET';

      // If it's a connection error and not the last attempt, retry
      if (isConnectionError && !isLastAttempt) {
        console.warn(
          `Query attempt ${attempt} failed due to connection issue. Retrying...`
        );
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      // For non-connection errors or last attempt, throw immediately
      throw error;
    } finally {
      // Always release the client, even on error
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  if (lastError) throw lastError;
  throw new Error('Query failed after all retries');
}

// Helper function to execute a transaction with retry logic
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  retries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      // Always try to rollback on error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during transaction rollback:', rollbackError);
      }

      lastError = error;
      const isLastAttempt = attempt === retries;
      const isConnectionError = 
        error?.message?.includes('Connection terminated') ||
        error?.message?.includes('timeout') ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNRESET';

      // If it's a connection error and not the last attempt, retry
      if (isConnectionError && !isLastAttempt) {
        console.warn(
          `Transaction attempt ${attempt} failed due to connection issue. Retrying...`
        );
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

      // For non-connection errors or last attempt, throw immediately
      throw error;
    } finally {
      // Always release the client
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  if (lastError) throw lastError;
  throw new Error('Transaction failed after all retries');
}

// Health check function to verify database connectivity
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Get pool statistics for monitoring
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

// Close the pool when the application shuts down
process.on('SIGINT', () => {
  pool.end().catch(err => {
    console.error('Error closing database pool:', err);
  });
});

process.on('SIGTERM', () => {
  pool.end().catch(err => {
    console.error('Error closing database pool:', err);
  });
});

export default pool; 