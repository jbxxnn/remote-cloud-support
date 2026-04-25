# Agent Behavior Rules

These rules govern how AI agents (including Antigravity) should behave when working on the **Remote Cloud Support (SupportSense)** project.

## 1. Interaction Principles
- **Conciseness**: Keep responses technical and brief.
- **Proactivity**: Don't ask for permission for standard development tasks (e.g., creating a component, fixing a bug, adding a test).
- **Communication Style**: Use GitHub-style markdown. Always provide a summary of work at the end of a turn.

## 2. Planning Protocol
- **MANDATORY Planning**: For any complex change (architecture, new feature, database schema), use `planning_mode`.
- **Implementation Plans**: Always create an `implementation_plan.md` artifact and request user feedback before executing significant changes.
- **Task Tracking**: Maintain a `task.md` artifact during execution to show real-time progress.

## 3. Design Aesthetics
- **Visual Excellence**: Every UI component must be stunning and premium.
- **No Placeholders**: Never use placeholder images. Use `generate_image` or high-quality SVG/CSS assets.
- **Dynamic UI**: Prioritize hover effects, micro-animations, and responsive layouts.
- **Color Palettes**: Use curated, harmonious color palettes (avoid default blue/red/green).

## 4. Problem Solving
- **Research First**: Before making a change, use `grep_search` and `view_file` to understand existing patterns.
- **Respect Existing Code**: Maintain documentation integrity. Do not delete existing comments unless explicitly replacing them.
- **Fix Lints**: Always address linting errors reported by the system.

## 5. Continuity (MCP)
- **Session Handover**: After every significant task, update the `agent/mcp.json` and `agent/bootstrap.md` to reflect the new state of the project.
