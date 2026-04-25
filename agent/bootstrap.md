# Session Bootstrap Protocol

**WELCOME AGENT.** Read this file entirely to synchronize with the current state of the **Remote Cloud Support** development environment.

## 1. Project Identity
- **Name**: SupportSense
- **Purpose**: A platform for remote care monitoring, detection handling (falls, etc.), and Standard Operating Procedure (SOP) management for staff.

## 2. Immediate Education
Before doing anything, you MUST read the following in order:
1. `agent/mcp.json`: Current task and last major changes.
2. `agent/rules/behavior.md`: How to communicate and plan.
3. `agent/rules/coding-standards.md`: Our technical stack and migration rules.

## 3. Current Focus (Phase 1.5)
We are currently finalizing the core workflows.
- **Completed**: Auth, 3-column dashboard layout, WebRTC calls, Basic Detections.
- **In-Progress**: Enhanced SOP responses, Event timeline linking, Google Drive/Meet sync.

## 4. Key Landmarks
- **Dashboard**: `src/app/staff/page.tsx`
- **SOPs**: `src/components/sops/`
- **Detections**: `src/app/api/webhooks/detections/route.ts`
- **Database**: `database/`

## 5. How to Start a conversation
When you start a new conversation with the USER:
1. Greet them as **Antigravity**.
2. Briefly summarize the last task completed (from `agent/mcp.json`).
3. Ask for the next priority if it's not clear from the task list.

---
*Stay consistent. Stay educated. Protect the work.*
