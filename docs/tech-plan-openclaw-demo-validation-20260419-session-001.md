# Technical Plan

## Metadata

- Topic: openclaw demo validation
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The scanner now supports standard OpenClaw roots plus `skills.load.extraDirs` from `~/.openclaw/openclaw.json`. The repository already contains a demo workspace for generic precedence and risk validation, but it does not yet provide a self-contained OpenClaw validation layout.

Without a repo-local OpenClaw demo, validating the new behavior depends on the real user home directory, which is fragile and hard to reproduce.

## Goal

Add a self-contained OpenClaw demo setup inside the repository so contributors can verify OpenClaw root discovery and precedence ordering with one command.

## Non-Goals

- Replacing the existing generic demo dataset in `public/data/demo-scan.json`
- Modeling bundled OpenClaw install-time skills in the demo
- Adding UI-only behavior just for demo mode

## Proposed Approach

Create a repo-local OpenClaw validation fixture with two parts:

1. Extend `examples/demo-workspace/` with:
   - `skills/` for OpenClaw workspace roots
   - `.agents/skills/` as project agent roots
2. Add `examples/demo-home/` with:
   - `.agents/skills/` as personal agent roots
   - `.openclaw/skills/` as managed/local roots
   - `.openclaw/openclaw.json` defining `skills.load.extraDirs`
   - an extra shared skills directory referenced by that config

Use same-named skills across those layers so the precedence chain is easy to inspect:

- workspace `skills/` should win
- project `.agents/skills/` should rank below workspace
- personal `.agents/skills/` should rank below project agent skills
- managed `~/.openclaw/skills` should rank below personal agent skills
- config `extraDirs` should be discovered as lowest-precedence extra roots

Add a dedicated npm script and README instructions so the OpenClaw demo can be scanned with a custom `--home` path.

## Impacted Files

- `docs/tech-plan-openclaw-demo-validation-20260419-session-001.md`
- `examples/demo-workspace/README.md`
- `examples/demo-workspace/...`
- `examples/demo-home/...`
- `package.json`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- Demo fixtures can become stale if scanner precedence changes later.
- Adding too many demo layers can reduce readability, so the OpenClaw fixture should stay small and purpose-built.
- The OpenClaw demo should not overwrite the meaning of the existing multi-agent risk demo; it should complement it.

## Validation

- `npm run scan:demo`
- `npm run scan:demo:openclaw`
- `npm run typecheck`
- Manual review: OpenClaw override chains show workspace > project agent > personal agent > managed > extra dir

## Open Questions

- Whether a future iteration should generate a dedicated OpenClaw demo JSON payload for the frontend
- Whether the generic demo script should eventually default to the OpenClaw-aware home fixture
