# Technical Plan

## Metadata

- Topic: openclaw config aware roots
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The previous OpenClaw integration added lightweight support for standard OpenClaw skill roots, but it intentionally left out two OpenClaw-specific behaviors:

- automatic import of `skills.load.extraDirs` from `~/.openclaw/openclaw.json`
- OpenClaw-specific semantics for `.agents/skills`

The user asked to continue, which means the integration should move from "lightweight manual support" toward "OpenClaw-aware support" without turning the scanner into a full OpenClaw runtime clone.

## Goal

Make root discovery OpenClaw-aware enough that common OpenClaw setups work without manual `extraRoots` configuration and `.agents/skills` participate in the OpenClaw precedence chain under the same agent family.

## Non-Goals

- Parsing every OpenClaw config feature beyond `skills.load.extraDirs`
- Discovering bundled OpenClaw install-time skills from package internals
- Modeling OpenClaw allowlists, gating, or plugin enablement behavior

## Proposed Approach

Update root discovery in three ways:

1. Read `~/.openclaw/openclaw.json` when present.
2. Extract `skills.load.extraDirs` if it is a string array and add those directories as extra scan roots with a dedicated discovery method.
3. Reclassify known `.agents/skills` roots as OpenClaw agent roots so:
   - `<workspace>/.agents/skills`
   - `~/.agents/skills`
   participate under the `openclaw` agent family instead of the current generic bucket.

This keeps precedence and conflict grouping closer to documented OpenClaw behavior while preserving the existing root-candidate architecture.

## Impacted Files

- `docs/tech-plan-openclaw-config-aware-roots-20260419-session-001.md`
- `src-core/scanner/discover-roots.ts`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- Treating `.agents/skills` as OpenClaw roots may make the generic `.agents` interpretation less neutral, but it better matches the documented OpenClaw runtime model.
- The config parser should fail closed. If `openclaw.json` is absent or malformed, discovery should continue without throwing.
- `extraDirs` are lowest precedence in OpenClaw, but Skill Doctor only uses them as additional discovered roots. That is sufficient for scan coverage and conflict visibility, but it is not the same as reproducing every runtime gating rule.

## Validation

- `npm run typecheck`
- Manual review of root discovery for OpenClaw workspace, agent, managed, and extra-dir roots
- Manual review of README support notes

## Open Questions

- Whether future work should surface bundled OpenClaw skills as a synthetic low-precedence root
- Whether the UI should show a more specific label than `openclaw` for agent-level `.agents/skills`
