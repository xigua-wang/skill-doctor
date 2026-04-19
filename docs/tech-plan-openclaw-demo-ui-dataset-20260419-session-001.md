# Technical Plan

## Metadata

- Topic: openclaw demo ui dataset
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The repository now contains a working OpenClaw demo fixture and a dedicated CLI validation flow. However, the frontend still ships with only one bundled demo dataset, `public/data/demo-scan.json`, so the React UI cannot showcase the OpenClaw-specific precedence chain without creating a real local scan first.

## Goal

Add a bundled OpenClaw demo dataset and make it selectable in the frontend so the UI can demonstrate OpenClaw-specific root discovery and precedence behavior out of the box.

## Non-Goals

- Replacing the existing generic demo dataset
- Building a separate OpenClaw-only page or route
- Generating demo datasets dynamically in the browser

## Proposed Approach

1. Add `public/data/demo-scan-openclaw.json` based on the validated repo-local OpenClaw fixture.
2. Validate both bundled demo datasets during frontend build.
3. Extend the React app so demo mode can switch between:
   - the existing generic demo dataset
   - the new OpenClaw demo dataset
4. Keep the primary source toggle unchanged: history vs demo.

This preserves the current UI structure while making OpenClaw behavior visible without requiring a live scan.

## Impacted Files

- `docs/tech-plan-openclaw-demo-ui-dataset-20260419-session-001.md`
- `public/data/demo-scan-openclaw.json`
- `scripts/build-frontend.ts`
- `src/App.tsx`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- Two demo datasets add a small amount of UI complexity.
- Bundled demo JSON can drift if scanner logic changes, so build-time validation remains important.
- The OpenClaw demo dataset should stay focused on precedence and roots, not try to represent every product feature.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual review: frontend demo mode can switch to the OpenClaw dataset

## Open Questions

- Whether future work should generate bundled demo JSON files from the repo fixtures automatically
- Whether the default demo dataset should remain generic or switch based on user intent
