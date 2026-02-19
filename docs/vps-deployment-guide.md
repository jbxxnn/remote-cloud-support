# VPS Deployment Guide - Google Drive Polling

This guide covers setting up Google Drive polling on your VPS server.

## Quick Start

### Option 1: Shell Script (Easiest)

1. Make the script executable:
   ```bash
   chmod +x scripts/poll-drive-vps.sh
   ```

2. Test it manually:
   ```bash
   ./scripts/poll-drive-vps.sh
   ```

3. Add to crontab:
   ```bash
   crontab -e
   # Add this line (runs every 5 minutes):
   */5 * * * * /path/to/remote-cloud-support/scripts/poll-drive-vps.sh >> /var/log/poll-drive.log 2>&1
   ```

### Option 2: Direct TypeScript Script

1. Add to crontab:
   ```bash
   crontab -e
   # Add this line:
   */5 * * * * cd /path/to/remote-cloud-support && /usr/bin/node node_modules/.bin/tsx scripts/poll-google-drive.ts >> /var/log/poll-drive.log 2>&1
   ```

### Option 3: API Endpoint (Requires Authentication)

1. Get a session token or use CRON_SECRET
2. Add to crontab:
   ```bash
   crontab -e
   # Add this line:
   */5 * * * * curl -X POST https://your-domain.com/api/google-drive/poll -H "Authorization: Bearer YOUR_CRON_SECRET" --max-time 300 --silent >> /var/log/poll-drive.log 2>&1
   ```

## Systemd Timer Setup (Advanced)

For more control and better logging:

### 1. Create Service File

```bash
sudo nano /etc/systemd/system/poll-drive.service
```

Add:
```ini
[Unit]
Description=Google Drive Polling Service
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/remote-cloud-support
Environment="NODE_ENV=production"
EnvironmentFile=/path/to/remote-cloud-support/.env.local
ExecStart=/usr/bin/node /path/to/remote-cloud-support/node_modules/.bin/tsx /path/to/remote-cloud-support/scripts/poll-google-drive.ts
StandardOutput=journal
StandardError=journal
```

### 2. Create Timer File

```bash
sudo nano /etc/systemd/system/poll-drive.timer
```

Add:
```ini
[Unit]
Description=Run Google Drive Polling every 5 minutes
Requires=poll-drive.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

### 3. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable poll-drive.timer
sudo systemctl start poll-drive.timer
```

### 4. Check Status

```bash
# Check timer status
sudo systemctl status poll-drive.timer

# Check service logs
sudo journalctl -u poll-drive.service -f

# List all timers
systemctl list-timers
```

## PM2 Setup (If using PM2)

Add to your `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'start',
      // ... your existing config
    },
    {
      name: 'poll-drive',
      script: 'tsx',
      args: 'scripts/poll-google-drive.ts',
      cron_restart: '*/5 * * * *', // Every 5 minutes
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    }
  ]
};
```

Start:
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Environment Variables

Ensure these are set in your `.env.local` or system environment:

```bash
DATABASE_URL=postgresql://...
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
```

## Logging

### Cron Logs

If using cron, logs go to:
```bash
/var/log/poll-drive.log
```

Rotate logs to prevent disk fill:
```bash
# Add to /etc/logrotate.d/poll-drive
/var/log/poll-drive.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

### Systemd Logs

View logs:
```bash
sudo journalctl -u poll-drive.service -f
```

## Troubleshooting

### Script Not Running

1. Check cron is running:
   ```bash
   sudo systemctl status cron
   ```

2. Check cron logs:
   ```bash
   grep CRON /var/log/syslog
   ```

3. Test script manually:
   ```bash
   ./scripts/poll-drive-vps.sh
   ```

### Permission Issues

1. Ensure script is executable:
   ```bash
   chmod +x scripts/poll-drive-vps.sh
   ```

2. Check file ownership:
   ```bash
   ls -la scripts/poll-drive-vps.sh
   ```

### Environment Variables Not Loading

1. Ensure `.env.local` exists and has correct values
2. For systemd, use `EnvironmentFile` in service file
3. For cron, export in crontab or use the shell script

### Node/tsx Not Found

1. Use full paths in cron:
   ```bash
   which node
   which tsx
   ```

2. Or use the shell script which handles paths automatically

## Monitoring

### Check Polling Status

```bash
# Via API (if authenticated)
curl https://your-domain.com/api/google-drive/poll

# Check database for recent polling activity
psql $DATABASE_URL -c "SELECT id, \"lastPolledAt\", \"processingStatus\" FROM \"Recording\" WHERE \"source\" = 'google_meet' ORDER BY \"lastPolledAt\" DESC LIMIT 10;"
```

### Health Check

The polling service includes a health endpoint:
```bash
curl https://your-domain.com/api/google-drive/poll
```

Returns rate limit and circuit breaker status.

## Best Practices

1. **Choose one platform**: Don't run polling on both Vercel and VPS unless needed
2. **Monitor logs**: Set up log rotation and monitoring
3. **Test first**: Always test the script manually before adding to cron
4. **Use absolute paths**: In cron, always use full paths
5. **Set timeouts**: Cron jobs should have reasonable timeouts
6. **Error handling**: The script handles errors, but monitor logs for issues


