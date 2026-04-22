# Technical Plan

## Metadata

- Topic: conclusion prompt
- Date: 2026-04-22
- Session: 001
- Requested by: user

## Background

The project currently scans local skill roots, computes conflicts and risk signals, and can optionally produce model-assisted analysis with summary, findings, recommendations, and skill spotlights. The user wants additional conclusion prompts so they can separately optimize skill content and optimize skill weighting.

## Goal

Add two structured conclusion prompts to the model-assisted scan analysis result so snapshots with completed AI review can surface ready-to-use optimization prompts derived from the scan: one for skill content and one for skill weighting or precedence. Expose both prompts in the frontend and include them in markdown reports.

## Non-Goals

- Automatically editing any skill files.
- Implementing a new weight engine or changing current precedence scoring rules.

## Proposed Approach

Extend `ScanAnalysis` with a `conclusionPrompts` object that contains two prompt objects, each with a title, intent, and prompt text. Generate these prompts only as part of the existing model-analysis normalization flow so they are persisted with snapshots that have completed AI review. Keep a normalization fallback only inside the successful model-analysis path when the model response is incomplete. Update the scan validation schema, markdown report output, and the React UI to render both prompts in both English and Simplified Chinese only when model-assisted review succeeded.

## Impacted Files

- `src-core/types.ts`
- `src-core/analysis/analyze-scan.ts`
- `src-core/validation/scan-schema.ts`
- `scripts/scan-skills.ts`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- If the model returns an overly generic prompt, the feature becomes low value. A normalization fallback is needed inside the successful AI-analysis path to guarantee useful output.
- Adding nested prompt objects changes persisted snapshot shape, so schema validation and legacy compatibility must be handled carefully.

## Validation

- `npm run typecheck`
- `npm run build`
- Verify the generated markdown report includes both conclusion prompts.
- Verify the frontend renders both conclusion prompts for current scans with completed model analysis.

## Open Questions

- Whether the future product should support more prompt variants beyond content optimization and weight optimization.
- Whether the prompt should later include copy affordances or export actions in the UI.
