# Technical Plan

## Metadata

- Topic: openclaw lightweight integration
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The user wants Skill Doctor's CLI to support OpenClaw with a lightweight, low-cost integration path.

The current scanner already works on AgentSkills-style folders and already discovers project and global roots for several agent ecosystems. OpenClaw uses AgentSkills-compatible skill folders as well, but its standard locations and precedence differ from the current generic model.

Official OpenClaw docs describe these relevant roots:

- workspace skills: `<workspace>/skills`
- personal agent skills: `~/.agents/skills`
- project agent skills: `<workspace>/.agents/skills`
- managed/local skills: `~/.openclaw/skills`
- optional extra directories via `skills.load.extraDirs`

That means the codebase is already structurally close to supporting OpenClaw, but root discovery and precedence need targeted updates to avoid misleading override chains.

## Goal

Add lightweight OpenClaw support so CLI and UI scans can discover the main OpenClaw skill roots and produce more accurate precedence ordering for common OpenClaw setups.

## Non-Goals

- Parsing `~/.openclaw/openclaw.json` automatically
- Discovering bundled OpenClaw install-time skills from app or npm internals
- Building a full vendor-specific precedence engine for every ecosystem
- Adding OpenClaw-specific UI panels or configuration screens

## Proposed Approach

Extend the scanner with explicit OpenClaw root candidates and a slightly more precise precedence calculation:

1. Add `<workspace>/skills` as a project-level OpenClaw workspace root.
2. Add `~/.openclaw/skills` as a global OpenClaw managed/local root.
3. Teach fallback and path inference to recognize `.openclaw`.
4. Refine skill precedence so these common OpenClaw layers sort in a safer order:
   - `<workspace>/skills`
   - `<workspace>/.agents/skills`
   - other project roots
   - `~/.agents/skills`
   - `~/.openclaw/skills`
   - other global roots
   - system roots
5. Extend compatibility inference to recognize OpenClaw mentions in skill content.
6. Update README documentation to explain support scope and to point users to `extraRoots` for OpenClaw `skills.load.extraDirs` equivalents.

This keeps the implementation local to the scanner and documentation, which matches the repository's current architecture.

## Impacted Files

- `docs/tech-plan-openclaw-lightweight-integration-20260419-session-001.md`
- `src-core/scanner/discover-roots.ts`
- `src-core/scanner/scan-engine.ts`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- The precedence model will still be partial. It will be more accurate for OpenClaw than today, but it will not yet represent every ecosystem with fully vendor-specific rules.
- Not parsing `openclaw.json` means `skills.load.extraDirs` remains manual rather than automatic. This is acceptable for a lightweight integration because Skill Doctor already exposes `extraRoots`.
- Using path-based heuristics for precedence is intentionally pragmatic and may need future refactoring if more vendors are added.

## Validation

- `npm run typecheck`
- Manual review of root discovery logic for `<workspace>/skills`, `~/.openclaw/skills`, and `.agents/skills`
- Manual review of README examples and support statements

## Open Questions

- Whether a later iteration should parse `~/.openclaw/openclaw.json` and import `skills.load.extraDirs` automatically
- Whether bundled OpenClaw skills should eventually be modeled as a system-like root class
