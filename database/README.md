# Database Setup

This project uses PostgreSQL with raw SQL instead of Prisma ORM.

## Setup Instructions

### 1. Environment Variables

Set up your environment variables in Vercel:

- `DATABASE_URL`: Your Supabase transaction pooler connection string
  ```
  postgresql://postgres.zsimvxwdkciqumpszjjh:[YOUR-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
  ```

### 2. Database Schema

The database schema is defined in `database/schema.sql`. This creates:

- `User` table - for authentication and user management
- `Client` table - for multi-tenant client management
- `Device` table - for device management
- `Detection` table - for fall detection events
- `Alert` table - for alert management

### 3. Seed Data

Seed data is in `database/seed.sql` and includes:

- Admin user: `admin@example.com` / `admin123`
- Staff user: `staff@example.com` / `staff123`
- Sample client and device
- Sample detections and alerts

### 4. Running Setup

To set up the database:

```bash
npm run db:setup
```

This will:
1. Create all tables with proper indexes
2. Set up triggers for `updatedAt` timestamps
3. Insert seed data

### 5. Database Operations

All database operations are now handled through:

- `src/lib/database.ts` - Connection pool and query helpers
- `src/lib/db/users.ts` - User-related database operations
- Additional model files can be created in `src/lib/db/`

### 6. Benefits of Raw SQL

- No prepared statement conflicts with Supabase transaction pooler
- Better performance for complex queries
- Full control over SQL optimization
- Simpler deployment (no Prisma client generation needed)

## File Structure

```
database/
├── schema.sql          # Database schema
├── seed.sql           # Seed data
└── README.md          # This file

src/lib/
├── database.ts        # Database connection pool
└── db/
    └── users.ts       # User database operations
``` 