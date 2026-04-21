# Technical Plan

## Metadata

- Topic: ui scan first onboarding
- Date: 2026-04-21
- Session: 001
- Requested by: user

## Background

The current UI already supports local scans without model configuration, but the homepage still frames the product in a technical and infrastructure-heavy way. The hero copy emphasizes implementation details, while model analysis and scan creation appear as adjacent panels without a strong onboarding hierarchy.

The user asked to continue with the second follow-up option: improve onboarding so the UI makes "scan first, connect a model later if needed" feel like the default path.

## Goal

Make the homepage onboarding clearer and more conversion-friendly by leading with scan-first value, concrete first steps, and optional model enhancement messaging.

## Non-Goals

- Changing the scan API or server behavior
- Redesigning the whole dashboard information architecture

## Proposed Approach

Refresh the hero section and top-of-page layout to establish a stronger onboarding sequence.

1. Replace the current hero body with copy that explains the scan-first workflow in concrete terms.
2. Add a visible three-step onboarding block in the hero: choose a project, run a local scan, optionally add model review later.
3. Add a concise "what you get immediately" list so users understand the value before opening settings.
4. Reword the analysis panel heading and supporting copy to position model analysis as an optional enhancement rather than a prerequisite.
5. Add minimal styling to support the new onboarding cards without disturbing the existing visual language.

## Impacted Files

- `docs/tech-plan-ui-scan-first-onboarding-20260421-session-001.md`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- Adding more onboarding UI can make the hero denser, so the copy and layout need to stay compact.
- If the onboarding messaging becomes too generic, it may feel less technical than the rest of the product; the copy should stay concrete and operational.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual review of the hero and top panels for scan-first clarity on desktop and responsive layout

## Open Questions

- Whether the next iteration should collapse or defer some settings UI until after the first scan
- Whether to add a dedicated empty-state screen for first-run users with no history and no demo selection
