# Repository Guidelines

## Project Structure & Module Organization
`skill-doctor` is a local-first inspector with a typed scanner core and a local React app:

- `scripts/*.ts`: local CLI, frontend build, and dev server entry points.
- `src-core/`: scanner, storage, validation, and model-analysis modules.
- `src/`: React + TypeScript frontend.
- `public/data/`: bundled demo datasets such as `demo-scan.json`.
- `docs/`: product notes, tech plans, and generated reports such as `latest-report.md`.

Keep new logic close to the runtime that uses it: scanner/storage behavior belongs in `src-core/`, entrypoint orchestration in `scripts/`, UI behavior in `src/App.tsx`, and presentation-only updates in `src/styles.css`.

## Build, Test, and Development Commands
- `npm run scan`: scan the current project, run model analysis, and write an immutable snapshot under `~/.skill-doctor/scans`.
- `npm run report`: generate a fresh scan plus `docs/latest-report.md`.
- `npm run build`: build the React frontend into `dist/`.
- `npm run serve`: start the local Node server at `http://localhost:4173`.
- `npm run typecheck`: run the TypeScript compiler without emitting files.

Typical workflow: run `npm run typecheck`, then `npm run build`, then `npm run serve` to verify the UI against fresh history data.

## Coding Style & Naming Conventions
Use modern TypeScript/ESM with 2-space indentation, semicolons, and single quotes, matching `src/` and `scripts/`. Prefer small, focused functions and clear object literals over abstractions. Use `camelCase` for variables and functions, `PascalCase` for React components and TypeScript types, and kebab-case for filenames. Avoid new dependencies unless they materially simplify the codebase.

## Testing Guidelines
There is no formal automated test suite yet. Validate scanner or analysis changes by running `npm run scan` or `npm run report` and checking the stored snapshot or generated report for expected conflicts, precedence chains, risk findings, and analysis output. For UI changes, run `npm run build` and `npm run serve`, then verify both history-backed data and the bundled demo dataset in the browser. If you add tests later, place them near the affected module or under a dedicated `tests/` directory.

## Commit & Pull Request Guidelines
This workspace snapshot does not include `.git`, so historical commit conventions cannot be verified here. Use short, imperative commit messages such as `Add scan history filter` or `Force model analysis language`. Pull requests should describe the behavior change, list validation steps, and include screenshots when `src/App.tsx` or `src/styles.css` changes the dashboard.
