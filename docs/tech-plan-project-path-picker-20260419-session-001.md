# Technical Plan

## Metadata

- Topic: project path picker
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current scan form only exposes a plain text input for `projectPath`. That works, but it is inefficient for repeated use because many scans target paths that already exist in history or are already visible in the current session.

The user wants the scan target to support both a selection-based workflow and a free-form input workflow.

## Goal

Update the scan target control so users can either choose a known project path from a select control or type a path manually.

## Non-Goals

- Adding a native OS folder picker dialog
- Changing backend scan APIs or scan storage format

## Proposed Approach

Implement a small front-end mode switch for the scan target:

- `Select` mode for choosing from known project paths
- `Input` mode for entering an arbitrary path

Populate the select options from locally available context:

- project paths found in scan history
- the currently loaded scan path
- the demo scan path when available

Keep the submitted payload unchanged: the form still sends a single `projectPath` string to the existing `/api/scans` endpoint.

## Impacted Files

- `docs/tech-plan-project-path-picker-20260419-session-001.md`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- Without a native folder picker, the select list is only as useful as the locally known paths it can derive.
- Dual-mode controls can add small complexity if labels are not clear.
- Demo and history paths may include entries the user no longer wants; this is acceptable for this iteration because the input mode remains available.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: project path can be chosen from a select list
- Manual check: project path can still be entered manually
- Manual check: both modes submit a valid scan request

## Open Questions

- Whether a later iteration should add a true native folder picker endpoint via the local server
- Whether recently used paths should get pinned or ordered separately from generic history
