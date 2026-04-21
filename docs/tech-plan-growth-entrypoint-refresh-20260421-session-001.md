# Technical Plan

## Metadata

- Topic: growth entrypoint refresh
- Date: 2026-04-21
- Session: 001
- Requested by: user

## Background

The user published the project to GitHub and npm, but the current traction is modest. The repository already has a solid typed scanner, local UI, bilingual README files, and npm packaging, but the public entrypoints still read more like an engineering explanation than a high-conversion product surface.

The current README emphasizes architecture and model analysis early, the screenshots section is descriptive instead of proof-oriented, and the UI copy frames model analysis as mandatory even though local scans still complete without model configuration.

## Goal

Improve the public first impression and first-run clarity so the project is easier to understand, easier to try, and less likely to look gated by model configuration.

## Non-Goals

- Redesigning the scanner, storage, or scan result schema
- Building new UI flows or screenshot assets in this iteration

## Proposed Approach

Tighten the entrypoint messaging across README, npm metadata, and UI settings copy.

1. Rewrite the top of `README.md` and `README.zh-CN.md` so the first screen leads with concrete user problems, a faster proof-oriented quick start, and clearer differentiation between local scan value and optional model enhancement.
2. Add npm `keywords` and refine package metadata so the package is easier to discover from relevant search terms.
3. Remove "mandatory" framing from the frontend copy and analysis error message where the current behavior already allows scans without model configuration.

This approach improves conversion without changing the underlying runtime flow, which keeps the iteration low risk and easy to review.

## Impacted Files

- `docs/tech-plan-growth-entrypoint-refresh-20260421-session-001.md`
- `README.md`
- `README.zh-CN.md`
- `package.json`
- `src/App.tsx`
- `src-core/analysis/analyze-scan.ts`

## Risks And Tradeoffs

- Stronger growth-oriented messaging can overpromise if it drifts away from actual behavior, so wording must stay grounded in what the product already does.
- Reframing model analysis as optional in the copy may create some mismatch with legacy naming in stored snapshots, but it better reflects the current scan flow.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual README review for first-screen clarity and consistency with runtime behavior

## Open Questions

- Whether the next iteration should also change the actual onboarding flow so the UI defaults more aggressively toward scan-first behavior
- Whether to add committed screenshots or animated terminal/UI captures as the next conversion-focused change
