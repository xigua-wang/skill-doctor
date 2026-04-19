# Technical Plan

## Metadata

- Topic: analysis prompt upgrade
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current model-analysis prompt is functional but too loose. It defines the output keys and strict JSON requirement, but it does not give the model enough structure about:

- how to prioritize the data
- what counts as a useful finding
- how to separate observation from recommendation
- how to choose spotlighted skills

The result is workable but not yet robust or consistent enough for production-quality analysis.

## Goal

Upgrade the model prompt so analysis output is more stable, more decision-oriented, and better aligned with the local risk-priority layer.

## Non-Goals

- Changing the transport API away from `chat/completions`
- Expanding the stored `analysis` schema in this iteration

## Proposed Approach

Refactor `buildMessages()` in `src-core/analysis/analyze-scan.ts` into a clearer prompt contract with:

- a stronger system role definition
- explicit analysis priorities grounded in local risk and precedence data
- tighter output quality requirements for summary, findings, recommendations, and skill spotlights
- clearer spotlight-selection criteria so highlighted skills are justified and high-signal

Keep the same JSON schema to avoid ripple effects, but improve the instructions around:

- summary length and focus
- findings specificity
- recommendation actionability
- spotlight uniqueness and rationale quality
- language and evidence discipline

## Impacted Files

- `docs/tech-plan-analysis-prompt-upgrade-20260419-session-001.md`
- `src-core/analysis/analyze-scan.ts`

## Risks And Tradeoffs

- A more directive prompt can improve consistency, but if it is too verbose it may slightly increase token usage.
- Tighter prompt constraints may reduce creative variation, which is acceptable here because this is an audit workflow rather than an open-ended assistant task.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual review: prompt now encodes clearer analysis priorities and spotlight rules

## Open Questions

- Whether future iterations should add explicit few-shot examples
- Whether analysis should eventually separate “facts” and “recommendations” into different stored fields
