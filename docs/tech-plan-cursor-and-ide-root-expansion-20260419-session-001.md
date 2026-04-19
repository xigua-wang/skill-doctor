# Technical Plan

## Metadata

- Topic: cursor and ide root expansion
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current root discovery logic already covers Codex, Claude, Agents, Copilot, and GitHub candidates, but the supported IDE and agent scenarios are still incomplete. The user specifically called out:

- Claude global roots
- Cursor project roots
- Cursor global roots

Claude global is already partially covered as a candidate path, but the overall IDE support matrix should be expanded and documented more clearly. Cursor is not yet included in known-path discovery or hidden-directory fallback inference.

## Goal

Extend scan root discovery to explicitly support Cursor project and global skill directories, while keeping Claude global support visible and aligned with the broader IDE matrix.

## Non-Goals

- Implementing vendor-specific Cursor parsing rules beyond root discovery
- Adding every possible IDE or agent ecosystem in one iteration

## Proposed Approach

Update `discover-roots.ts` so known candidates include:

- `.cursor/skills` under the current project
- `.cursor/skills` under the user's home directory

Also extend hidden-directory fallback inference so `.cursor` is recognized as a valid agent root, with the proper label and agent id.

Update top-level docs to reflect Cursor support in the supported ecosystem list.

## Impacted Files

- `docs/tech-plan-cursor-and-ide-root-expansion-20260419-session-001.md`
- `src-core/scanner/discover-roots.ts`
- `README.md`

## Risks And Tradeoffs

- Cursor root conventions may vary across installations, so this remains a best-effort well-known-path strategy.
- Adding more root candidates increases scan breadth slightly, but the overhead is small because nonexistent paths are filtered quickly.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual review: `discover-roots.ts` includes Cursor project/global known paths
- Manual review: hidden-directory fallback recognizes `.cursor`

## Open Questions

- Whether future iterations should add vendor-specific metadata for Cursor instead of reusing generic skill handling
- Which IDEs should be prioritized next after Cursor
