# Technical Plan

## Metadata

- Topic: openclaw readme and onboarding prompt
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The repository now supports OpenClaw root discovery, `openclaw.json` extraDirs import, and a repo-local OpenClaw demo fixture. The user asked to update the README to reflect OpenClaw support clearly and to add a reusable prompt for one-click OpenClaw onboarding.

## Goal

Document OpenClaw support more explicitly in both READMEs and provide a copy-paste prompt that helps users onboard Skill Doctor into an OpenClaw workspace with minimal friction.

## Non-Goals

- Adding runtime automation beyond the current CLI and scanner behavior
- Creating a new backend or setup wizard for OpenClaw

## Proposed Approach

1. Add an OpenClaw support section to the English and Chinese READMEs.
2. Document the supported OpenClaw roots, current coverage, and the fastest commands to use Skill Doctor from an OpenClaw workspace.
3. Add a copy-paste prompt block that users can give to an OpenClaw agent to perform a lightweight Skill Doctor integration and initial scan.

## Impacted Files

- `docs/tech-plan-openclaw-readme-and-onboarding-prompt-20260419-session-001.md`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- The prompt must stay generic enough to work across repositories while still reflecting the actual supported workflow.
- README wording should not imply bundled OpenClaw skills are modeled when they are not.

## Validation

- Manual review of README consistency between English and Chinese
- `npm run typecheck`

## Open Questions

- Whether the prompt should also live in a dedicated docs file later
- Whether future releases should add a true setup command instead of a prompt-only workflow
