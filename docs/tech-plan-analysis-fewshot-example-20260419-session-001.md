# Technical Plan

## Metadata

- Topic: analysis few-shot example
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The model analysis prompt already enforces a structured JSON response and stronger reviewer guidance, but output style can still drift across providers. The user asked to continue improving the analysis quality after the recent prompt upgrade.

## Goal

Add a very small few-shot example to the analysis prompt so `summary`, `findings`, `recommendations`, and `skillSpotlights` stay more consistent without changing the output schema.

## Non-Goals

- Changing the persisted `analysis` JSON shape
- Adding a second model call or post-processing stage

## Proposed Approach

Keep the current `chat/completions` flow and existing schema contract. Extend `buildMessages()` with one compact synthetic example pair that demonstrates the expected reasoning density and output style. Keep the example short, generic, and structurally aligned with the current scan payload so token growth stays limited.

## Impacted Files

- `docs/tech-plan-analysis-fewshot-example-20260419-session-001.md`
- `src-core/analysis/analyze-scan.ts`

## Risks And Tradeoffs

- Even a small example increases prompt size, so the example must stay compact.
- Some providers may overfit to the exact wording of the example, so the example should model structure and quality, not domain-specific conclusions.

## Validation

- `npm run typecheck`
- `npm run build`

## Open Questions

- Whether a future provider-specific fallback should disable few-shot for especially token-constrained models
