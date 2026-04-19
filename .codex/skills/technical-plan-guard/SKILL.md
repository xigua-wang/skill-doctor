---
name: technical-plan-guard
description: Use this skill when the user introduces a new requirement, feature request, scope change, or implementation direction for this repository. Before coding, create a technical plan in docs using the required naming convention docs/tech-plan-<topic>-<YYYYMMDD>-session-<session-id>.md, then align the implementation to that plan.
---

# Technical Plan Guard

For this repository, any new requirement should start with a technical plan document under `docs/` before implementation work begins.

## When to use

Use this skill when the user:

- asks to add a new feature or workflow
- changes product or technical direction
- requests a non-trivial refactor
- asks for a new skill, rule, or repository convention

Skip this skill only for:

- typo or wording fixes
- trivial one-line bug fixes
- purely exploratory questions with no requested change

## Required output

Create a technical plan file in `docs/` with this filename pattern:

`docs/tech-plan-<topic>-<YYYYMMDD>-session-<session-id>.md`

Rules:

- use lowercase kebab-case for `<topic>`
- keep `<topic>` short and specific, usually 2 to 6 words
- use the current local date in `YYYYMMDD`
- keep the literal segment `session`
- use a short session identifier in `<session-id>`, such as `001`, `alpha`, or `new-skill`

Example:

`docs/tech-plan-new-skill-doc-rule-20260417-session-001.md`

## Working procedure

1. Infer a concise topic from the request.
2. Pick a session id that distinguishes the planning round.
3. Create the new plan file from `docs/technical-plan-template.md` if available.
4. Fill in scope, constraints, implementation steps, risks, and validation.
5. Only then proceed with code or content changes needed by the request.

## Plan content

The plan should cover:

- background
- goal and non-goals
- proposed approach
- file or module impact
- risks and tradeoffs
- validation steps

If the repository already contains a broader strategy document such as `docs/technical-plan.md`, treat it as context, not as the per-request plan file.
