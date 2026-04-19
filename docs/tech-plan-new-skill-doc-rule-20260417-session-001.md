# Technical Plan: New Skill Doc Rule

## Metadata

- Topic: new-skill-doc-rule
- Date: 20260417
- Session: 001
- Requested by: repository workflow update

## Background

The repository needs a project-level skill that standardizes how new requirements are introduced.
The user expects every new requirement to create a technical plan document under `docs/`, and the document name must follow a stable rule including topic, date, and session.

## Goal

Add a project-local skill that instructs Codex to create a technical plan before implementation.
Define one naming convention and one reusable template so future requests follow the same workflow.

## Non-Goals

- Building a full document generator
- Replacing the existing broad strategy document `docs/technical-plan.md`

## Proposed Approach

Create a new project-level skill under `.codex/skills/technical-plan-guard/` so it is discoverable by Codex-aware tooling.
Define the required filename format as `docs/tech-plan-<topic>-<YYYYMMDD>-session-<session-id>.md`.
Add `docs/tech-plan-naming-rule.md` to document the convention and `docs/technical-plan-template.md` as the reusable plan skeleton.
Create one concrete plan file for the current request to make the rule immediately real and testable.

## Impacted Files

- `.codex/skills/technical-plan-guard/SKILL.md`
- `docs/tech-plan-naming-rule.md`
- `docs/technical-plan-template.md`
- `docs/tech-plan-new-skill-doc-rule-20260417-session-001.md`
- `README.md`

## Risks And Tradeoffs

- The skill may trigger for some medium-sized changes that users consider lightweight, but that is safer than skipping planning too often.
- Session identifiers are intentionally flexible, which keeps usage simple but means teams still need light discipline.

## Validation

- Run `npm run scan` and confirm the new project skill is detected
- Review the generated scan output and verify the new docs files are present in the repository

## Open Questions

- Whether session ids should remain flexible or be restricted to numeric sequences only
- Whether future automation should generate the plan file from the template automatically
