# Google Drive Polling - Production Guide

This document describes the production-ready polling service improvements and how to use them.

## Overview

The polling service has been enhanced with production-grade features:

- ✅ **Rate Limiting**: Respects Google Drive API quotas (60 requests/minute)
- ✅ **Circuit Breaker**: Prevents cascading failures (opens after 5 failures, closes after 1 minute)
- ✅ **Distributed Locking**: Prevents duplicate processing across multiple instances
- ✅ **Parallel Processing**: Processes up to 3 recordings concurrently (configurable)
- ✅ **Exponential Backoff**: Automatic retry with backoff for transient errors
- ✅ **Structured Logging**: Detailed metrics and timing information
- ✅ **Transaction Safety**: Database updates are atomic and safe
- ✅ **Vercel Cron Integration**: Scheduled polling via Vercel Cron Jobs

## Architecture

### Rate Limiting

The service implements in-memory rate limiting to respect Google Drive API quotas:
- **Max Requests**: 60 requests per minute
- **Min Delay**: 100ms between requests
- **Window**: 1-minute sliding window

**Note**: For distributed deployments, consider using Redis for shared rate limiting state.

### Circuit Breaker

The circuit breaker prevents cascading failures:
- **Failure Threshold**: 5 consecutive failures
- **Timeout**: 1 minute before retrying
- **States**: `closed` (normal) → `open` (blocking) → `half-open` (testing)

### Distributed Locking

Uses database `lastPolledAt` field to prevent duplicate processing:
- Each recording is locked for 2 minutes during processing
- **Multiple instances can run safely without conflicts** (Vercel + VPS can both poll)
- Locks are automatically released on success or failure
- **Note**: While both platforms can run, it's recommended to choose one as primary to reduce API calls

### Parallel Processing

Processes multiple recordings concurrently:
- **Default Concurrency**: 3 recordings at a time
- **Configurable**: Adjust via `concurrency` option
- **Safe**: Each recording is independently locked

## Usage

### Deployment Scenarios

This project supports **dual deployment** (Vercel + VPS). The distributed locking ensures both can run safely without conflicts.

### Choosing Your Polling Platform

**Recommendation**: Choose ONE platform as the primary polling source to avoid unnecessary API calls:
- **Vercel**: Use if Vercel is your primary deployment
- **VPS**: Use if VPS is your primary deployment or you need more control

**Both can run simultaneously** - the locking mechanism prevents duplicate processing, but running both increases API usage unnecessarily.

### Disabling Polling on One Platform

If you want to disable polling on a specific platform:

**Disable on Vercel:**
- Remove the cron entry from `vercel.json`, OR
- Set `CRON_SECRET` to an invalid value in Vercel environment variables

**Disable on VPS:**
- Remove or comment out the cron job entry
- Stop the systemd timer: `sudo systemctl stop poll-drive.timer`
- Stop PM2 cron: `pm2 delete poll-drive`

### Option 1: Vercel Cron (Vercel Deployment)

The service includes a Vercel Cron endpoint that runs automatically:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/poll-drive",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

**Security**: Protect the cron endpoint with a secret:

```bash
# .env.local (Vercel Environment Variables)
CRON_SECRET=your-secret-key-here
```

The endpoint will verify the `Authorization: Bearer <CRON_SECRET>` header.

**To disable on Vercel**: Remove the cron entry from `vercel.json` or set `CRON_SECRET` to an invalid value.

### Option 2: VPS Cron Job (VPS Deployment)

For VPS deployments, use system cron or a process manager:

#### A. System Cron (Recommended)

**Option 1: Use the provided shell script** (recommended):

```bash
# Make script executable
chmod +x scripts/poll-drive-vps.sh

# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * /path/to/remote-cloud-support/scripts/poll-drive-vps.sh >> /var/log/poll-drive.log 2>&1
```

**Option 2: Call the API endpoint directly**:

```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * curl -X POST https://your-vps-domain.com/api/google-drive/poll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  --max-time 300 \
  --silent --show-error >> /var/log/poll-drive.log 2>&1
```

**Option 3: Use the standalone TypeScript script directly**:

```bash
# Add to crontab
*/5 * * * * cd /path/to/remote-cloud-support && /usr/bin/node node_modules/.bin/tsx scripts/poll-google-drive.ts >> /var/log/poll-drive.log 2>&1
```

#### B. PM2 Cron (If using PM2)

Create a PM2 ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'start',
      // ... your app config
    },
    {
      name: 'poll-drive',
      script: 'tsx',
      args: 'scripts/poll-google-drive.ts',
      cron_restart: '*/5 * * * *', // Every 5 minutes
      autorestart: false,
      watch: false,
    }
  ]
};
```

Start with: `pm2 start ecosystem.config.js`

#### C. Systemd Timer (Advanced)

Create a systemd service and timer:

```ini
# /etc/systemd/system/poll-drive.service
[Unit]
Description=Google Drive Polling Service
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/remote-cloud-support
Environment="NODE_ENV=production"
EnvironmentFile=/path/to/.env.local
ExecStart=/usr/bin/node /path/to/node_modules/.bin/tsx scripts/poll-google-drive.ts
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/poll-drive.timer
[Unit]
Description=Run Google Drive Polling every 5 minutes
Requires=poll-drive.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable poll-drive.timer
sudo systemctl start poll-drive.timer
```

### Option 3: Manual API Call

Trigger polling manually via API:

```bash
# From Vercel
curl -X POST https://your-app.vercel.app/api/google-drive/poll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d '{
    "intervalMinutes": 5,
    "maxResults": 50,
    "concurrency": 3,
    "enableRateLimit": true,
    "enableCircuitBreaker": true
  }'

# From VPS
curl -X POST https://your-vps-domain.com/api/google-drive/poll \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "intervalMinutes": 5,
    "maxResults": 50,
    "concurrency": 3,
    "enableRateLimit": true,
    "enableCircuitBreaker": true
  }'
```

### Option 4: Standalone Script (Development/Local)

For local development:

```bash
npm run poll:drive
```

Or with custom options:

```bash
tsx scripts/poll-google-drive.ts --interval=5 --max-results=50
```

## Configuration Options

### PollingOptions

```typescript
interface PollingOptions {
  intervalMinutes?: number;      // Default: 5
  maxResults?: number;            // Default: 50
  concurrency?: number;           // Default: 3
  enableRateLimit?: boolean;      // Default: true
  enableCircuitBreaker?: boolean;  // Default: true
}
```

### Response Stats

```typescript
interface PollingStats {
  checked: number;      // Number of recordings checked
  processed: number;    // Number successfully processed
  errors: number;       // Number of errors
  skipped: number;      // Number skipped (rate limit/circuit breaker)
  duration: number;     // Duration in milliseconds
  timestamp: string;    // ISO timestamp
}
```

## Monitoring

### Health Check

Check polling service health:

```bash
curl http://localhost:3000/api/google-drive/poll
```

Response includes:
- Rate limit status (requests in window, can proceed)
- Circuit breaker state (closed/open/half-open, failures)

### Logging

The service logs structured information:

```
[Drive Polling] Found 3 pending recordings (processing with concurrency: 3)
[Drive Polling] ✅ Successfully processed recording abc-123
[Drive Polling] ❌ Failed to process recording def-456: Error message
[Drive Polling] Completed: {"checked":3,"processed":2,"errors":1,"skipped":0,"duration":5234}
```

## Error Handling

### Rate Limit Errors

When rate limited:
- Requests are skipped (not failed)
- `skipped` count is incremented
- Service waits for rate limit window to reset

### Circuit Breaker

When circuit is open:
- All requests are blocked
- `skipped` count is incremented
- Circuit automatically closes after timeout

### Transient Errors

Transient errors (429, 503, 500) are automatically retried:
- Exponential backoff: 1s, 2s, 3s
- Up to 3 retries per recording
- Rate limit errors are handled separately

## Production Checklist

### For Vercel Deployment
- [ ] Set `CRON_SECRET` environment variable in Vercel dashboard
- [ ] Configure Vercel Cron schedule in `vercel.json`
- [ ] Verify cron job is running (check Vercel logs)

### For VPS Deployment
- [ ] Set up cron job or systemd timer
- [ ] Set `CRON_SECRET` environment variable (if using API endpoint)
- [ ] Ensure `.env.local` is properly configured
- [ ] Test cron job manually before enabling
- [ ] Set up log rotation for polling logs

### For Both Deployments
- [ ] **Choose primary polling platform** (Vercel OR VPS, not both recommended)
- [ ] Monitor rate limit usage (check health endpoint)
- [ ] Set up alerts for circuit breaker opening
- [ ] Review concurrency settings based on load
- [ ] Consider Redis for distributed rate limiting (if multiple instances)
- [ ] Set up logging/monitoring (e.g., Vercel Analytics, Sentry, VPS logs)
- [ ] Test distributed locking works correctly

## Troubleshooting

### Circuit Breaker Keeps Opening

**Symptom**: Circuit breaker opens frequently, blocking all requests.

**Causes**:
- Google Drive API credentials expired
- Network issues
- API quota exceeded

**Solutions**:
- Check Google Drive API credentials
- Verify network connectivity
- Check API quota limits
- Review error logs for specific failures

### Rate Limit Issues

**Symptom**: Many requests are skipped due to rate limiting.

**Solutions**:
- Increase `intervalMinutes` (poll less frequently)
- Decrease `concurrency` (process fewer in parallel)
- Check if other services are using the same API quota

### Recordings Not Processing

**Symptom**: Recordings remain in `pending` status.

**Check**:
1. Are recordings being locked? (check `lastPolledAt`)
2. Is circuit breaker open? (check health endpoint)
3. Are files found in Google Drive? (check logs)
4. Are there errors in processing? (check error logs)

## Performance Tuning

### Concurrency

Adjust based on:
- API quota limits
- Processing time per recording
- Available resources

**Recommendations**:
- **Low load**: 1-2 concurrent
- **Medium load**: 3-5 concurrent
- **High load**: 5-10 concurrent (if quota allows)

### Polling Interval

Adjust based on:
- How quickly recordings need to be processed
- API quota limits
- System load

**Recommendations**:
- **Real-time**: 1-2 minutes
- **Standard**: 5 minutes (default)
- **Low priority**: 10-15 minutes

## Migration from Old Polling

The new polling service is backward compatible. Existing recordings will be processed automatically.

**No migration needed** - just deploy the new code and configure Vercel Cron.

## Future Improvements

Potential enhancements:
- [ ] Redis-based distributed rate limiting
- [ ] Metrics export (Prometheus, Datadog)
- [ ] Dead letter queue for failed recordings
- [ ] Automatic retry scheduling for failed recordings
- [ ] Webhook integration (preferred over polling)

