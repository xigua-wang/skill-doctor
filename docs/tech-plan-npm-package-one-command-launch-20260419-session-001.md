# Technical Plan

## Metadata

- Topic: npm package one command launch
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The project currently runs as a repository-local app with `npm run build` and `npm run serve`. The user wants a packageable form that works after `npm install`, then launches analysis for the current project with a single command.

## Goal

Ship a package-ready CLI entry so users can install `skill-doctor` and run one command that starts the local UI for the current working directory.

## Non-Goals

- Publishing to the npm registry in this iteration
- Reworking the frontend architecture or scan data model

## Proposed Approach

Add a package build pipeline that bundles the Node CLI/server entry points into `lib/` and keeps the built frontend in `dist/`. Expose a `skill-doctor` bin command that defaults to the current working directory, performs an initial scan, starts the local server, and attempts to open the browser. Update the server to resolve static assets relative to its installed package location instead of the caller's project root.

## Impacted Files

- `docs/tech-plan-npm-package-one-command-launch-20260419-session-001.md`
- `package.json`
- `scripts/build-package.ts`
- `scripts/dev-server.ts`
- `scripts/scan-skills.ts`
- `README.md`

## Risks And Tradeoffs

- Bundling increases build complexity and requires the static asset path logic to be installation-safe.
- Auto-opening the browser may behave differently across platforms, so it should fail silently and remain optional.

## Validation

- `npm run typecheck`
- `npm run build`
- `npm run build:package`
- Run the packaged CLI locally with `--help` and a no-open startup check

## Open Questions

- Whether a later iteration should add a dedicated `doctor` or `scan` subcommand layout
