# Technical Plan

## Metadata

- Topic: local risk priority scoring
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current model-analysis preselection step ranks skills with a simple local heuristic:

- `risk count * 10`
- `issue count * 4`
- `+2` for project scope

That is lightweight, but it is not rigorous enough. It ignores severity weighting, treats all risks as equal regardless of impact, and gives little visibility into why one skill was prioritized ahead of another. The user wants the local layer to be more reliable before model analysis runs.

## Goal

Replace the current count-based local ranking with a severity-aware, explainable priority model so that the most operationally important skills are selected for model analysis first.

## Non-Goals

- Replacing the regex-based local scanner with a full semantic analyzer
- Introducing remote services or a second model call for local prioritization

## Proposed Approach

Add a structured local-priority computation in `src-core/analysis/analyze-scan.ts` and use it to rank skills before truncating to `analysis.maxSkills`.

The new ranking should:

- weight `high`, `medium`, and `low` findings differently
- weight risks more heavily than issues
- preserve a small preference for project-scoped skills when risk profiles are close
- use stable tie-breakers so ordering stays deterministic

Also include a compact local-priority summary in the prompt payload for each sampled skill. This keeps the prompt more explainable and gives the model explicit context about why the skill was selected.

## Impacted Files

- `docs/tech-plan-local-risk-priority-scoring-20260419-session-001.md`
- `src-core/analysis/analyze-scan.ts`
- `README.md`

## Risks And Tradeoffs

- Stronger weighting makes the heuristic more opinionated; some edge cases may still need later tuning.
- Adding local-priority metadata to the prompt slightly increases token usage, though the payload remains compact.
- If the weights are too aggressive, medium-risk clusters could crowd out broader but lower-severity patterns.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual review: local prioritization now ranks high-severity risks above medium and low severity findings
- Manual review: sort order remains deterministic for equal-score skills

## Open Questions

- Whether future UI work should expose the local-priority breakdown directly in the detail panel
- Whether scan records should eventually persist the local-priority score for debugging and audits
