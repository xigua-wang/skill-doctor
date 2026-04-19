# Technical Plan

## Metadata

- Topic: analysis structured input and output guardrails
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current model analysis flow already uses a compact scan payload and a strengthened prompt, but the payload still leaves too much first-pass aggregation work to the model. The normalized model output is also permissive: it trims arrays, but it does not strongly deduplicate, filter generic statements, validate spotlight references, or provide a robust fallback summary.

## Goal

Improve model analysis reliability in two ways: make the analysis payload more structured and reviewer-friendly before it is sent, and add stricter runtime validation and repair when model output is read back.

## Non-Goals

- Changing the persisted `ScanAnalysis` schema
- Adding new frontend UI for analysis internals in this iteration

## Proposed Approach

Refactor `buildMessages()` so the model receives a more explicit `compactScan` that includes summarized evidence buckets such as top risk skills, conflict hotspots, metadata gaps, configured roots, and precedence-sensitive chains. Keep a trimmed `skills` list for drill-down, but move high-value signals into dedicated aggregates so the model does less implicit reasoning.

On the output side, add stricter normalization:
- generate a fallback summary when the model omits one
- deduplicate findings and recommendations more aggressively
- filter generic low-signal lines
- validate `skillSpotlights.skillId` against the current scan
- trim and cap output more predictably

## Impacted Files

- `docs/tech-plan-analysis-structured-input-and-output-guardrails-20260419-session-001.md`
- `src-core/analysis/analyze-scan.ts`

## Risks And Tradeoffs

- A richer payload increases token usage, so aggregates must stay compact.
- Aggressive normalization can over-trim useful nuance if the heuristics are too blunt.

## Validation

- `npm run typecheck`
- `npm run build`

## Open Questions

- Whether we should persist the structured compact payload for debugging in a later iteration
