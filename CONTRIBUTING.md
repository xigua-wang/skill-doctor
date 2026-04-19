# Contributing

Thanks for contributing to Skill Doctor.

This project is a local-first inspector for coding-agent skills. Contributions are most useful when they improve one of these areas:

- skill root discovery
- local scan quality and conflict detection
- model-analysis reliability
- UI clarity and inspectability
- packaging, docs, and local developer workflow

## Before You Start

Read these files first:

- [README.md](./README.md)
- [AGENTS.md](./AGENTS.md)

This repository uses a lightweight planning rule for non-trivial changes:

- if you add a feature, change workflow direction, or make a non-trivial refactor, add a short technical plan in `docs/`
- use the naming pattern:
  - `docs/tech-plan-<topic>-<YYYYMMDD>-session-<id>.md`

## Local Setup

Install dependencies:

```bash
npm install
```

Type-check:

```bash
npm run typecheck
```

Build frontend assets:

```bash
npm run build
```

Start the local app:

```bash
npm run serve
```

## Common Validation

For most code changes, run:

```bash
npm run typecheck
npm run build
```

If your change affects scanning or analysis, also run:

```bash
npm run scan
```

If your change affects demo behavior or screenshots, also run:

```bash
npm run scan:demo
```

If your change affects release packaging, also run:

```bash
npm run build:package
```

## Code Guidelines

- Use TypeScript and ESM
- Prefer small functions and explicit data flow over abstraction-heavy code
- Keep scanner logic in `src-core/`
- Keep CLI and server orchestration in `scripts/`
- Keep React UI behavior in `src/App.tsx`
- Keep presentation-only changes in `src/styles.css`

Avoid adding dependencies unless they materially simplify the codebase.

## Pull Requests

When opening a PR, include:

- a short description of the behavior change
- the validation steps you ran
- screenshots if the UI changed
- any new docs or tech-plan files added for the change

Prefer short, imperative commit messages such as:

- `Add scoped npm publish metadata`
- `Harden local config response handling`
- `Refine history filtering behavior`

## Scope Notes

Skill Doctor is not trying to be:

- a cloud service
- a general-purpose filesystem crawler
- a full security audit platform

It is a local inspector and review tool for coding-agent skill systems. Contributions should keep that scope clear.
