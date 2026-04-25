# Feature Implementation Workflow

Standard Operating Procedure (SOP) for building new features in SupportSense.

## Phase 1: Planning
1. **Research**: Understand the requirement and check existing components.
2. **Draft Plan**: Create an `implementation_plan.md` artifact.
3. **User Approval**: Wait for explicit feedback or approval.

## Phase 2: Database Layer
1. **Migration**: Create a new SQL migration in `database/`.
2. **Apply migration**: Run `npm run db:migrate` (or manual application) to update the local/test database.
3. **Types**: Update TypeScript interfaces to reflect new data structures.

## Phase 3: Backend Layer
1. **API Route**: Create route handlers in `src/app/api/`.
2. **Testing**: Use `test-webhook.js` or manual curl commands to verify API responses.
3. **Assistant Integration**: Update `src/lib/assistant/` if the new feature needs AI guidance.

## Phase 4: Frontend Layer
1. **Components**: Build reusable UI components in `src/components/`.
2. **Pages**: Integrate components into `src/app/staff/` or `src/app/admin/`.
3. **State Management**: Use React hooks (useState, useReducer) or context if necessary.
4. **Visual Polish**: Add animations and ensure "Visual Excellence."

## Phase 5: Verification
1. **Manual Test**: Verify the feature end-to-end (e.g., "Staff can create a record").
2. **Lint check**: Run `npm run lint`.
3. **Session Handover**: Update `agent/mcp.json` and `agent/bootstrap.md`.
