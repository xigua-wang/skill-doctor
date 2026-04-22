# Technical Plan

## Metadata

- Topic: streaming staged analysis
- Date: 2026-04-22
- Session: 001
- Requested by: user

## Background

The current scan workflow blocks on a single `POST /api/scans` request. Local scanning, model analysis, and prompt generation all complete before the UI receives anything. That creates two problems:

1. The user sees no intermediate progress during long scans.
2. Model analysis asks for summary, findings, recommendations, spotlights, and reusable conclusion prompts in one response, which increases response size and timeout risk.

The user specifically wants a progressive return path instead of waiting for the full analysis blob, and wants to reduce timeout risk caused by generating all conclusions at once.

## Goal

Add a progressive scan workflow that streams stage updates to the frontend and split model analysis into a core-review phase plus a separate prompt-generation phase so long responses are less likely to timeout.

## Non-Goals

- Replacing the current OpenAI-compatible chat-completions transport with provider-native websocket APIs
- Persisting partially completed scans as separate history entries

## Proposed Approach

1. Refactor the scan engine so local scan construction can run independently from model analysis.
2. Split model analysis into two requests:
   - phase 1: summary, findings, recommendations, and skill spotlights
   - phase 2: reusable conclusion prompts derived from the scan plus phase-1 output
3. Add a streaming scan endpoint in the local dev server that emits newline-delimited JSON events for stage transitions and the final saved scan.
4. Update the React app to consume the streaming endpoint, surface progress messages during the run, and replace the current blocking `POST /api/scans` path for interactive scans.
5. If phase 2 fails, keep the phase-1 analysis and synthesize fallback conclusion prompts locally instead of failing the entire analysis.

## Impacted Files

- `docs/tech-plan-streaming-staged-analysis-20260422-session-001.md`
- `src-core/analysis/analyze-scan.ts`
- `src-core/scanner/scan-engine.ts`
- `scripts/dev-server.ts`
- `src/App.tsx`

## Risks And Tradeoffs

- Two model requests increase total call count, but each response is smaller and easier to complete within the timeout window.
- Streaming status over NDJSON is simpler than websocket infrastructure, but it is one-way and only covers request-lifetime progress.
- The CLI path will still be synchronous unless explicitly updated later; this change focuses on the local app workflow first.

## Validation

- `npm run typecheck`
- Manual review of the stream event sequence and staged analysis fallbacks

## Open Questions

- Whether the CLI should later expose the same streamed progress output
- Whether a future iteration should persist intermediate phase timing or provider diagnostics in `analysis.raw`
