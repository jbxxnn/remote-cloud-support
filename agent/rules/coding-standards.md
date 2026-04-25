# Coding Standards

These rules ensure technical excellence and consistency in the **Remote Cloud Support** codebase.

## 1. Technologies
- **Framework**: Next.js 15.3+ (App Router).
- **Runtime**: React 19.
- **Styling**: Tailwind CSS (Primary) + Vanilla CSS (for complex animations).
- **UI Components**: Radix UI primitives + Custom styled components.
- **Icons**: Lucide React / HugeIcons.
- **Database**: PostgreSQL (via `pg` driver).
- **Authentication**: NextAuth.js.

## 2. Directory Structure
- `src/app/`: App router pages and layouts.
- `src/components/`: Reusable UI components.
- `src/lib/`: Shared utilities, API clients, and database logic.
- `src/hooks/`: Custom React hooks.
- `database/`: SQL migrations and schema definitions.
- `scripts/`: Maintenance and utility scripts.

## 3. Database Protocol
- **MANDATORY Migrations**: Never modify the database schema without a migration script in `database/`.
- **Naming Convention**: use `database/migration-[number]-[description].sql`.
- **Execution**: Apply migrations using `npm run db:migrate` or equivalent tool before deploying API changes.

## 4. TypeScript & Type Safety
- **Strict Mode**: Always use strict TypeScript.
- **No `any`**: The use of `any` is forbidden unless strictly necessary (e.g., third-party library without types).
- **Interfaces**: Prefer `interface` over `type` for public APIs and component props.

## 5. API Development
- **Next.js Route Handlers**: Use standard Next.js 15 route handler patterns in `src/app/api/`.
- **Validation**: Validate all incoming requests.
- **Error Handling**: Use consistent JSON error responses with proper HTTP status codes.

## 6. Client vs Server Components
- **Server First**: Use React Server Components (RSC) by default.
- **`'use client'`**: Only use client components for interactivity (state, effects, events).
- **Data Fetching**: Fetch data in Server Components and pass down as props when possible.
