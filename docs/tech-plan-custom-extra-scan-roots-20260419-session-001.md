# Technical Plan

## Metadata

- Topic: custom extra scan roots
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

Built-in root discovery now covers more IDEs and agents, but directory conventions will continue to fragment. Relying only on hard-coded well-known paths and hidden-directory fallback is not enough for long-term coverage.

The next pragmatic step is to let users configure additional scan roots explicitly.

## Goal

Add a global config field for custom extra scan roots and include those paths in root discovery with clear provenance.

## Non-Goals

- Building a full rule engine for custom agent metadata
- Adding per-project overrides in this iteration

## Proposed Approach

Extend `AppConfig.scan` with `extraRoots: string[]`.

Frontend:

- expose the field in the settings drawer as a newline-separated textarea
- store and load it through the existing `/api/config` flow

Scanner:

- normalize configured paths
- include them in discovered root candidates with `discoveryMethod = "user-configured"`
- infer `scope` from location relative to the current project and home directory
- infer `agent` from the path when possible, otherwise fall back to `generic`
- give user-configured roots `confidence = "confirmed"`

## Impacted Files

- `docs/tech-plan-custom-extra-scan-roots-20260419-session-001.md`
- `src-core/types.ts`
- `src-core/storage/config-store.ts`
- `src-core/scanner/discover-roots.ts`
- `src/App.tsx`
- `src/styles.css`
- `README.md`

## Risks And Tradeoffs

- Users can configure invalid or noisy paths; nonexistent directories will still be filtered later by the existing existence checks.
- Newline-based path entry is simple but may be less ergonomic than a richer list editor.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: saving custom extra roots persists to config
- Manual check: configured roots appear in root discovery and scans

## Open Questions

- Whether future versions should store label and agent metadata alongside each custom root
- Whether per-project custom roots should override or merge with global config
