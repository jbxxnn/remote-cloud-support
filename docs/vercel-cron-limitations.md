# Vercel Cron Jobs - Plan Limitations

## Overview

Vercel Cron Jobs have significant limitations based on your plan. This document explains these limitations and provides recommendations.

## Plan Limits

| Plan | Cron Jobs | Schedule | Invocations |
|------|----------|----------|-------------|
| **Hobby** | 2 total (across all projects) | Once per day max | Limited |
| **Pro** | 40 per account | Unlimited | Unlimited |
| **Enterprise** | 100 per account | Unlimited | Unlimited |

## Hobby Plan Limitations

### Critical Restrictions

1. **Only 2 cron jobs total** across ALL your Vercel projects
   - If you have multiple projects, you share these 2 slots
   - Not per project - it's account-wide

2. **Once per day maximum**
   - Cannot run every 5 minutes
   - Cannot run hourly
   - Maximum frequency: `0 0 * * *` (once daily at midnight)

3. **No timing guarantees**
   - Vercel cannot assure timely execution
   - A cron job scheduled for 1:00 AM may run anywhere between 1:00 AM and 1:59 AM

### Why This Doesn't Work for Our Use Case

Our Google Drive polling needs to:
- Run every 5 minutes (`*/5 * * * *`)
- Process recordings in near real-time
- Handle multiple recordings concurrently

**Hobby plan cannot support this.**

## Recommendations

### Option 1: Use VPS for Polling (Recommended)

**Best for**: Hobby plan users, or anyone wanting full control

**Advantages**:
- ✅ No plan limitations
- ✅ Full control over schedule
- ✅ Can run every 5 minutes
- ✅ Better for production workloads
- ✅ No additional costs

**Setup**: See `docs/vps-deployment-guide.md`

### Option 2: Upgrade to Pro Plan

**Best for**: Users who want Vercel-managed cron jobs

**Advantages**:
- ✅ Managed by Vercel
- ✅ No server maintenance
- ✅ Integrated with Vercel dashboard
- ✅ Can run every 5 minutes

**Disadvantages**:
- ❌ Requires paid Pro plan ($20/month)
- ❌ Still limited to 40 cron jobs total

### Option 3: Use External Cron Service

**Best for**: Users who want managed cron without Vercel Pro

**Options**:
- **EasyCron**: Free tier available
- **Cron-job.org**: Free tier available
- **GitHub Actions**: Free for public repos
- **AWS EventBridge**: Pay per execution

**Setup**: Configure external service to call:
```
POST https://your-app.vercel.app/api/google-drive/poll
Authorization: Bearer YOUR_CRON_SECRET
```

## Current Configuration

The cron job is **disabled by default** in `vercel.json` to prevent deployment issues.

### To Enable (Pro/Enterprise Only)

1. Uncomment the cron section in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/poll-drive",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

2. Set `CRON_SECRET` in Vercel environment variables

3. Deploy

### To Keep Disabled (Recommended for Hobby)

Leave the cron section commented out in `vercel.json` and use VPS polling instead.

## Migration Path

If you're currently on Hobby and want to use cron:

1. **Short term**: Use VPS polling (see `docs/vps-deployment-guide.md`)
2. **Long term**: Consider upgrading to Pro if you need Vercel-managed cron jobs

## FAQ

### Can I use Vercel Cron on Hobby plan?

**Technically yes, but not recommended:**
- You only get 2 cron jobs total (shared across all projects)
- They can only run once per day
- Not suitable for our 5-minute polling requirement

### What happens if I exceed my cron limit?

Vercel will reject the deployment or disable excess cron jobs.

### Can I use both Vercel and VPS polling?

Yes! The distributed locking prevents duplicate processing. However, it's recommended to use one primary source to reduce API calls.

### Should I upgrade to Pro just for cron?

**Not necessary** - VPS polling is free and more flexible. Only upgrade if you need other Pro features.

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Pricing](https://vercel.com/pricing)
- [VPS Deployment Guide](./vps-deployment-guide.md)


