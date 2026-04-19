# Technical Plan

## Metadata

- Topic: recent project paths in picker
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The home-directory project picker now supports browsing from the user's home directory, but repeated navigation through deep folder trees is still inefficient for common projects. The user asked to add recent paths.

## Goal

Show recently used project paths inside the picker so users can jump directly to common scan targets before browsing the filesystem tree.

## Non-Goals

- Adding a separate persistence layer for favorites
- Reordering or rewriting scan history storage

## Proposed Approach

Derive recent paths from local scan history and display them above the directory browser in select mode.

Rules:

- use scan history order as recency order
- deduplicate paths
- exclude broken records and placeholder values
- cap the list to a small number

Clicking a recent path should:

- set it as the active scan target
- load that directory into the browser view

## Impacted Files

- `docs/tech-plan-recent-project-paths-in-picker-20260419-session-001.md`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- History-derived recency is only as accurate as the stored scan list returned by the backend.
- Recently used paths may include directories that no longer exist; this iteration can still display them because the user may want to inspect or retry them.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: recent paths appear in select mode
- Manual check: clicking a recent path updates the browser to that path

## Open Questions

- Whether a later iteration should distinguish pinned paths from recent paths
- Whether recently used paths should also include manually entered but unscanned paths
