# Technical Plan

## Metadata

- Topic: mandatory model analysis
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current product exposes an `Enable model analysis` toggle in the settings UI and stores `analysis.enabled` in global config. That model makes AI analysis optional, which no longer matches the desired workflow. The new requirement is to remove the toggle and make every scan go through the model-analysis stage by default.

Today the codebase reflects the optional design in three places:

- frontend settings form and copy in `src/App.tsx`
- default config and merge logic in `src-core/storage/config-store.ts`
- analysis gating logic in `src-core/analysis/analyze-scan.ts`

## Goal

Make model analysis a mandatory scan stage. The UI should no longer expose an enable/disable switch, and the backend should always attempt model analysis for each scan.

## Non-Goals

- Replacing the current `chat/completions` integration with another API family
- Introducing provider-specific branching beyond the current compatibility fixes

## Proposed Approach

Remove the `analysis.enabled` flag from configuration and from the React settings form. Treat model analysis as always on.

At the backend layer, delete the disabled short-circuit in `analyzeScanWithModel()`. A scan will always enter the analysis pipeline; if configuration is incomplete, the scan will still complete but the `analysis` payload will record a non-success result instead of a disabled skip state. This preserves historical visibility and keeps scan persistence resilient during rollout, while aligning the product with the mandatory-analysis rule.

Update UI copy so the settings panel describes model analysis as built-in behavior rather than an optional feature. Also remove the disabled-state message because that path will no longer exist.

## Impacted Files

- `docs/tech-plan-mandatory-model-analysis-20260419-session-001.md`
- `src-core/types.ts`
- `src-core/storage/config-store.ts`
- `src-core/analysis/analyze-scan.ts`
- `src/App.tsx`
- `README.md`

## Risks And Tradeoffs

- Existing config files may still contain `analysis.enabled`; merge logic must tolerate stale data while no longer depending on it.
- Making analysis mandatory in product semantics without hard-failing missing config means scans can still finish with an analysis error state. This is intentional for operational resilience, but it is weaker than a strict “no model, no scan” rule.
- Historical snapshots may still contain `reason: disabled`; the UI must remain able to render them safely even after the toggle is removed.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: settings UI no longer shows `Enable model analysis`
- Manual check: a new scan still writes an `analysis` object and no longer produces a new `disabled` skip state

## Open Questions

- Whether a future iteration should hard-block scan creation when `apiKey`, `baseUrl`, or `model` is missing
- Whether historical `disabled` snapshots need a migration or can remain as legacy records
