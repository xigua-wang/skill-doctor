# Technical Plan

## Metadata

- Topic: demo validation workspace
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The product has grown beyond a simple static demo payload. It now includes:

- global immutable scan history
- typed runtime validation
- local priority scoring
- model-analysis prompting with language control
- multilingual UI

The user wants a concrete demo project that can be scanned locally to validate these behaviors end to end, instead of relying only on bundled sample JSON.

## Goal

Add a real demo workspace inside the repository that can be scanned by Skill Doctor to exercise conflicts, precedence, risks, issues, and local-priority behavior.

## Non-Goals

- Creating a second standalone application with its own runtime
- Replacing the bundled `public/data/demo-scan.json` frontend demo payload

## Proposed Approach

Create an `examples/demo-workspace/` directory that mimics a realistic repository with agent skill folders under:

- `.codex/skills`
- `.claude/skills`
- `.agents/skills`
- `.github/skills`

Populate it with a curated set of skills that intentionally cover:

- duplicate normalized skill names for precedence-chain and override behavior
- trigger overlap across different skills
- high-risk patterns like `curl | bash` and `rm -rf`
- medium-risk shell/network patterns
- low-risk secret/env references
- issue generation such as missing triggers
- different local-priority scores so the ranking is explainable

Also add a short README in the demo workspace explaining what each skill is meant to trigger and how to scan it.

Optionally add a package script for convenience so the demo workspace can be scanned with one command.

## Impacted Files

- `docs/tech-plan-demo-validation-workspace-20260419-session-001.md`
- `examples/demo-workspace/README.md`
- `examples/demo-workspace/...`
- `package.json`
- `README.md`

## Risks And Tradeoffs

- A demo workspace can drift from scanner behavior over time if it is not maintained alongside feature changes.
- Intentionally risky sample content must remain clearly non-executable and explanatory to avoid confusion.
- Adding too many demo skills could make the example noisy; the workspace should stay small but high signal.

## Validation

- `npm run scan -- --project ./examples/demo-workspace`
- `npm run typecheck`
- `npm run build`
- Manual check: scan shows conflicts, precedence chains, risk findings, and local-priority differences

## Open Questions

- Whether the demo workspace should eventually be used to generate `public/data/demo-scan.json`
- Whether we should add a dedicated `npm run scan:demo` script for convenience
