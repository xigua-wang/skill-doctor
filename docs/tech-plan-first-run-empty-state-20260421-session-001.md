# Technical Plan

## Metadata

- Topic: first run empty state
- Date: 2026-04-21
- Session: 001
- Requested by: user

## Background

The UI now presents a scan-first onboarding message in the hero, but the first-run state still falls back directly to demo data when there is no stored scan history. That keeps the page populated, but it weakens the main product path for new users because the first visible dataset is not their own workspace.

The user asked to continue tightening the homepage for first-run users, so the next step is to add a dedicated empty state that explicitly guides them toward scanning the current project before exploring demos or settings.

## Goal

Add a stronger first-run empty state that highlights the lack of stored scans, explains what the user can do next, and keeps the local scan action as the primary path.

## Non-Goals

- Removing demo datasets from the product
- Changing the initial boot logic or API behavior

## Proposed Approach

Add a conditional first-run panel near the top of the page when there are no stored scans.

1. Detect the first-run condition using the existing scan list length.
2. Render a dedicated empty-state panel with a clear headline, concise explanation, and three actions:
   - start a local scan
   - open the demo dataset
   - open settings for optional model review
3. Adjust hero-side guidance so the recommended next step reflects whether history exists.
4. Keep the rest of the dashboard intact so the user can still inspect demo data if they choose to.

## Impacted Files

- `docs/tech-plan-first-run-empty-state-20260421-session-001.md`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- An additional top-level panel can increase visual density, so the empty state must stay compact and action-oriented.
- Keeping demo data visible alongside first-run guidance still introduces a split path, but it avoids removing the existing proof surface.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual review of the no-history state for action clarity and layout quality

## Open Questions

- Whether a future iteration should default the page to a lighter empty canvas instead of showing demo metrics underneath
- Whether the scan form should pre-expand more aggressively for first-run users
