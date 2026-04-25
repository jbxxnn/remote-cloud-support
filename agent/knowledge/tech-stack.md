# Project Tech Stack

A snapshot of the core technologies powering SupportSense.

## Frontend
- **Framework**: Next.js 15.3.6 (App Router)
- **Library**: React 19.0.0
- **Styling**: Tailwind CSS 3.4
- **State/Data**: React Hooks
- **Icons**: Lucide React, HugeIcons
- **UI primitives**: Radix UI
- **Animations**: Tailwind Animate, CSS transitions

## Backend & API
- **Language**: TypeScript 5.x
- **Server**: Next.js Route Handlers
- **Database**: PostgreSQL (via `pg`)
- **Real-time**: Socket.io (Signaling server in `/signaling`)
- **Worker/Scripts**: `tsx` for running scripts

## Intelligence & AI
- **LLM**: Gemini (via `@google/generative-ai`)
- **Assistant**: Custom rules-based + AI hybrid
- **Audio**: Google Cloud Speech-to-Text

## Auth & Security
- **Provider**: NextAuth.js 4.24.11
- **Encryption**: bcryptjs
- **Token**: JWT

## Infrastructure
- **Deployment**: VPS (manual/PM2) or Vercel
- **Cloud Storage**: Synology (planned), Google Drive (integration started)
- **Database Hosting**: Local Postgres or Supabase
