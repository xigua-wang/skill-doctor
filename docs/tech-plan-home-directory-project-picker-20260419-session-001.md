# Technical Plan

## Metadata

- Topic: home directory project picker
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current scan target supports `Select` and `Input`, but the select mode only reuses known paths from local app state. The user clarified that select mode should support choosing from the user's root area, meaning an actual directory browser rooted at the user's home directory.

## Goal

Replace the current history-based select mode with a home-directory-backed project picker that lets users browse folders under their home directory and choose a scan target without typing the path manually.

## Non-Goals

- Adding native OS folder dialogs
- Allowing browsing outside the user's home directory in this iteration

## Proposed Approach

Add a local server endpoint that returns directory listings constrained to `os.homedir()`. The frontend select mode will become a lightweight directory browser:

- start at the user's home directory
- show current path and parent navigation
- list readable child directories
- allow selecting the current folder as the scan target

Keep input mode unchanged for arbitrary manual paths.

## Impacted Files

- `docs/tech-plan-home-directory-project-picker-20260419-session-001.md`
- `scripts/dev-server.ts`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- Restricting browsing to the home directory is safer and simpler, but it excludes projects stored elsewhere.
- A custom directory browser is less capable than a native file picker, but it avoids platform-specific work.
- Large directories could be noisy, so listings should stay directory-only and sorted.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: select mode starts in the user's home directory
- Manual check: user can move down into subdirectories and back up
- Manual check: selected folder is submitted as `projectPath`

## Open Questions

- Whether a later iteration should add an opt-in way to browse outside the home directory
- Whether recently selected folders should be pinned alongside the browser
