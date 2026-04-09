# VPS Database Migration Checklist

This checklist is specific to this project as it exists now.

## Executive Summary

Moving the database from Supabase to PostgreSQL on your InterServer VPS is feasible without changing the overall application architecture.

Why:

- The application already uses plain PostgreSQL via `pg` and `DATABASE_URL`.
- Authentication uses NextAuth credentials against your own `User` table.
- NextAuth is using JWT sessions, not a database adapter.

Current status:

- Main app database access is VPS-ready.
- Authentication is VPS-ready.
- A few old scripts still assume Supabase admin access.
- One recording upload path still contains a Supabase Storage placeholder URL.

## What Is Already Compatible

### Database access

The main database layer is already generic PostgreSQL:

- `src/lib/database.ts`
- Uses `process.env.DATABASE_URL`
- Uses `pg` connection pooling

This means the app does not care whether PostgreSQL is hosted on Supabase or on your own VPS, as long as the schema and connection string are correct.

### Authentication

Auth is handled through:

- `src/lib/auth.ts`
- `src/lib/db/users.ts`

Important details:

- Uses `next-auth`
- Uses `CredentialsProvider`
- Validates passwords with `bcryptjs`
- Reads users from your own `User` table
- Uses JWT session strategy

This is good news. You are not using Supabase Auth, so moving the database does not require an auth-provider migration.

### Local file uploads

Evidence uploads are already written to local disk:

- `src/app/api/evidence/upload/route.ts`
- Files are saved under `public/uploads/evidence`

That fits a VPS deployment well, provided you handle backups and persistent storage.

## What Still Depends on Supabase

These items do not block the core database migration, but they should be cleaned up if you want to be fully independent of Supabase.

### Legacy migration scripts

These scripts still use `@supabase/supabase-js` and expect:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- a Supabase RPC called `exec_sql`

Files found:

- `scripts/run-device-migration.js`
- `scripts/run-nullable-clientid-migration.js`
- `scripts/run-simplify-device-migration.js`

Action:

- Rewrite them to use `pg` directly, like the newer migration scripts already do.

### Supabase storage placeholder for call recordings

This route still hardcodes a Supabase-style recording URL:

- `src/app/api/calls/[id]/recording/route.ts`

Current behavior:

- It does not actually upload the recording.
- It stores a placeholder URL:
  - `https://storage.supabase.co/recordings/${callSessionId}.webm`

Action:

- Replace this with real local-file or object-storage handling on your VPS.

## Required Changes Before or During Migration

### 1. Fix UUID extension mismatch

In `database/schema.sql`, the schema enables:

- `uuid-ossp`

But the schema uses:

- `gen_random_uuid()`

On PostgreSQL, `gen_random_uuid()` usually comes from `pgcrypto`, not `uuid-ossp`.

Action:

Use one of these options:

1. Preferred:
   - Add `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
   - Keep `gen_random_uuid()`
2. Alternative:
   - Replace all `gen_random_uuid()` usages with `uuid_generate_v4()`

Recommended approach:

- Add `pgcrypto`
- Keep current SQL unchanged otherwise

### 2. Make SSL configurable

In `src/lib/database.ts`, production always enables SSL:

- `ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false`

This may be wrong for a local PostgreSQL server on your VPS.

Risk:

- The app may fail to connect if your VPS Postgres is not configured for SSL.

Recommended change:

- Add an env-controlled SSL flag, for example:
  - `DATABASE_SSL=true|false`

Suggested logic:

- `DATABASE_SSL=true` for managed/remote SSL databases
- `DATABASE_SSL=false` for local VPS Postgres unless you explicitly configure TLS

### 3. Decide how recordings should be stored

For call recordings, choose one of:

1. Local filesystem on the VPS
2. S3-compatible object storage
3. Another external storage provider

Recommended for now:

- Use local filesystem first for simplicity
- Move to object storage later if needed

If using local filesystem:

- Store files outside the app build output
- Save file path and public URL in `CallRecording`
- Back up the storage directory regularly

## Migration Plan

## Phase 1: Prepare the VPS PostgreSQL Server

1. Install PostgreSQL on the VPS.
2. Create a dedicated database and user for this app.
3. Restrict access:
   - allow local/private access only where possible
   - use a strong password
   - limit firewall exposure
4. Enable the required extension:
   - `pgcrypto` recommended
5. Verify the database accepts connections from the app server.

Example target variables:

```env
DATABASE_URL=postgresql://app_user:strong_password@127.0.0.1:5432/remote_support
```

If the app and database are on the same VPS, prefer:

- `127.0.0.1` or local socket access

## Phase 2: Export Data from Supabase

You need both schema state and data.

Recommended export approach:

1. Dump schema from the current Supabase database.
2. Dump data from the current Supabase database.
3. Keep a rollback backup before cutover.

What to preserve:

- all application tables
- all indexes
- all constraints
- all trigger functions
- all seed/admin users currently in use

Important:

- This project has multiple SQL migration files in `database/`
- The live Supabase database may contain more than `database/schema.sql`
- Do not assume `schema.sql` alone reflects production

Recommended validation:

- Compare live database tables against the migration files before cutover

## Phase 3: Import into VPS PostgreSQL

1. Create the new empty database.
2. Enable required extensions first.
3. Import schema.
4. Import data.
5. Recreate or verify:
   - indexes
   - triggers
   - foreign keys
6. Run sanity checks on critical tables:
   - `User`
   - `Client`
   - `Device`
   - `Alert`
   - `SOP`
   - `SOPResponse`
   - `Evidence`
   - `Transcript`
   - `CallSession`
   - `CallRecording`

Validation queries to run:

- user count
- client count
- active device count
- latest alerts
- latest recordings
- sample login user exists

## Phase 4: Update Application Configuration

Update environment variables on the VPS:

```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret
DATABASE_URL=postgresql://app_user:strong_password@127.0.0.1:5432/remote_support
```

If you make SSL configurable, also add:

```env
DATABASE_SSL=false
```

Also review and remove old Supabase env vars if no longer needed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep them only temporarily if you still need the old Supabase migration scripts during transition.

## Phase 5: Adjust Code

### Must-do changes

1. Fix UUID extension support in `database/schema.sql`
2. Make DB SSL configurable in `src/lib/database.ts`

### Strongly recommended changes

1. Rewrite legacy Supabase migration scripts to use `pg`
2. Replace the recording placeholder flow in `src/app/api/calls/[id]/recording/route.ts`

### Optional cleanup

1. Remove unused `supabase/` config if you fully stop using Supabase
2. Remove any docs that assume Supabase is still the primary database host

## Phase 6: Test Before Cutover

Test these flows on the VPS against the new PostgreSQL database:

1. Login as admin
2. Login as staff
3. Load admin dashboard
4. Load staff dashboard
5. Create a client
6. Create a device
7. Load alerts
8. Create or update SOP data
9. Upload evidence
10. Run any polling or cron jobs that read/write the database

Also test:

- Google Drive polling
- recording processing paths
- transcript generation
- compliance and incident routes

## Phase 7: Cutover

Recommended cutover flow:

1. Put the app into a short maintenance window if needed.
2. Stop writes to the old Supabase database.
3. Take a final backup/export from Supabase.
4. Import final delta if needed.
5. Switch `DATABASE_URL` to the VPS database.
6. Restart the app.
7. Run smoke tests immediately.

## Difficulty Estimate

### Database-only move

Difficulty: `3/10` to `4/10`

Why it is relatively easy:

- app already uses PostgreSQL directly
- auth already uses your own tables
- no Supabase Auth migration required
- no ORM replacement required

### Fully removing Supabase from the project

Difficulty: `5/10` to `6/10`

Why it is a bit harder:

- legacy scripts still depend on Supabase admin RPC behavior
- recording storage path still references Supabase-style storage
- documentation and setup flow need cleanup

## Risks To Watch

### Schema drift

Biggest practical risk:

- Your live Supabase database may not exactly match the checked-in SQL files.

Mitigation:

- inspect live schema before cutover
- compare table/column/index presence
- test with a copy of production data

### SSL connection mismatch

Risk:

- production code currently assumes SSL in production mode

Mitigation:

- make SSL env-driven before cutover

### Local file persistence

Risk:

- files stored on local disk can be lost if the VPS is rebuilt or storage fails

Mitigation:

- use backups
- consider mounting persistent storage
- consider object storage later

### Backups

Risk:

- self-hosting the database means backup responsibility is now yours

Mitigation:

- schedule automated PostgreSQL dumps
- test restore procedure

## Recommended Order Of Work

1. Fix `schema.sql` UUID extension issue.
2. Make database SSL configurable.
3. Provision PostgreSQL on the VPS.
4. Export current Supabase database.
5. Import into VPS PostgreSQL.
6. Point staging or test deployment at the VPS database.
7. Test login and CRUD flows.
8. Rewrite legacy migration scripts.
9. Replace recording storage placeholder.
10. Cut over production.

## Suggested Post-Migration Improvements

After the move is stable, I recommend:

1. create a single migration runner for all SQL files
2. add a proper health check for DB and disk storage
3. move recording storage to a real implementation
4. add scheduled backups for both database and uploaded files
5. document a restore procedure

## Project Files Relevant To This Migration

- `src/lib/database.ts`
- `src/lib/auth.ts`
- `src/lib/db/users.ts`
- `database/schema.sql`
- `database/seed.sql`
- `scripts/setup-database.js`
- `scripts/run-migration.js`
- `scripts/run-alert-events-migration.js`
- `scripts/run-device-migration.js`
- `scripts/run-nullable-clientid-migration.js`
- `scripts/run-simplify-device-migration.js`
- `src/app/api/calls/[id]/recording/route.ts`
- `src/app/api/evidence/upload/route.ts`

## Final Recommendation

You should move the database to your VPS if your goal is to control hosting costs and own the infrastructure.

For this project, the move is realistic because the hard part has already been done:

- the app is already built around PostgreSQL
- the auth system already uses your own user records

The migration should be treated as:

- straightforward for the database
- moderate for full Supabase removal

If you want, the next step can be for me to implement the first code changes directly:

1. make database SSL configurable
2. fix the UUID extension issue
3. rewrite the leftover Supabase migration scripts
