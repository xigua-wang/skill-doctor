# Technical Plan

## Metadata

- Topic: analysis timeout error normalization
- Date: 2026-04-22
- Session: 001
- Requested by: user

## Background

The current model-analysis flow surfaces raw request-abort errors such as `This operation was aborted` in the UI. That message comes from the underlying fetch runtime rather than from the product, so users do not get a clear explanation that the analysis likely timed out or how to respond.

## Goal

Normalize aborted model-analysis and connection-test failures into product-level timeout messaging, and ensure the UI renders those failures clearly instead of exposing raw runtime text.

## Non-Goals

- Changing the provider API contract or switching away from the current chat-completions request shape
- Redesigning the analysis card UI or adding new analysis states

## Proposed Approach

Add a shared error-normalization helper in `src-core/analysis/analyze-scan.ts` that maps aborted requests to a stable timeout reason and a user-facing message containing the configured timeout. Reuse that helper in both the main analysis request and the connection test. Then update `src/App.tsx` translations and analysis-message formatting so timeout failures render as actionable product copy in both English and Chinese.

## Impacted Files

- `docs/tech-plan-analysis-timeout-error-normalization-20260422-session-001.md`
- `src-core/analysis/analyze-scan.ts`
- `src/App.tsx`

## Risks And Tradeoffs

- A generic timeout message is less diagnostic than the raw runtime exception, but it is more useful for the main user path and still preserves the structured `reason`.
- Some providers may abort for causes other than timeout; the current implementation deliberately treats local `AbortController` cancellations as timeout because that is how this app uses abort today.

## Validation

- `npm run typecheck`
- Manual review of timeout and connection-failure strings in `src/App.tsx`

## Open Questions

- Whether the settings UI should later recommend a larger timeout when users choose slower reasoning models
- Whether scan records should persist a richer provider error payload for troubleshooting beyond the user-facing message
