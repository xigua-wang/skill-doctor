# Technical Plan

## Metadata

- Topic: skill doctor no auto scan default
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The new npm package entry currently starts the UI and immediately runs an initial scan against the current working directory. The user wants a lighter default behavior: open the UI with the current directory as the default project context, but do not scan until the user explicitly starts one.

## Goal

Change the default `skill-doctor` behavior so it launches the UI for the current directory without running an automatic initial scan.

## Non-Goals

- Changing the scan API or frontend scan interaction
- Removing the ability to trigger an initial scan from the CLI entirely

## Proposed Approach

Flip the server entry default so auto-scan is opt-in instead of opt-out. Keep the current directory as the default project context for later manual scans. Update CLI help text and README so the package behavior is accurately documented.

## Impacted Files

- `docs/tech-plan-skill-doctor-no-auto-scan-default-20260419-session-001.md`
- `scripts/dev-server.ts`
- `README.md`

## Risks And Tradeoffs

- Users who expected the old one-command auto-scan behavior now need an explicit flag.
- Keeping the project context without a scan means the UI may first open onto history or empty state until the user triggers a scan.

## Validation

- `npm run typecheck`
- `node --import tsx ./scripts/dev-server.ts --help`
- `npm run build:package`

## Open Questions

- Whether to add an explicit `--scan` flag to make the opt-in behavior more discoverable
