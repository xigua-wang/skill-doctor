# Technical Plan

## Metadata

- Topic: analysis response language
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The product now supports English and Chinese UI, but model analysis output still depends entirely on the provider's default behavior. That creates a mismatch: the application chrome may be in one language while the analysis summary, findings, recommendations, and spotlight rationales come back in another.

The new requirement is to explicitly force the analysis prompt to request a specific response language.

## Goal

Make model analysis prompts explicitly request a target language, using the current UI language for app-triggered scans and English as the CLI default unless overridden.

## Non-Goals

- Translating historical model outputs after they have already been stored
- Adding multilingual storage or per-field localization inside scan records

## Proposed Approach

Add a shared response-language type with two supported values: `en` and `zh-CN`.

For scans created from the web UI:

- send the current UI language in the `POST /api/scans` request body
- pass that value into the scan engine
- inject a hard language instruction into the model prompt

For scans created from the CLI:

- default the analysis response language to English
- support an optional CLI flag to override it when needed

Keep the persisted scan schema unchanged for this iteration. The language affects prompt generation and returned content, but it does not need to be stored as a new top-level field yet.

## Impacted Files

- `docs/tech-plan-analysis-response-language-20260419-session-001.md`
- `src-core/types.ts`
- `src-core/analysis/analyze-scan.ts`
- `src-core/scanner/scan-engine.ts`
- `scripts/dev-server.ts`
- `scripts/scan-skills.ts`
- `src/App.tsx`

## Risks And Tradeoffs

- The provider may still occasionally mix languages in edge cases, even with a hard instruction, so this improves behavior but does not create an absolute guarantee.
- If UI language switching happens after a scan is already stored, the stored analysis remains in its original language. That is expected for immutable history.
- Not persisting response language in the scan record keeps this iteration lean, but reduces future auditability.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: UI-triggered scan in English asks the model for English output
- Manual check: UI-triggered scan in Chinese asks the model for Simplified Chinese output
- Manual check: CLI scan still defaults to English

## Open Questions

- Whether a later iteration should persist the chosen analysis response language in the scan record metadata
- Whether connection testing should also accept an explicit language override for consistency
