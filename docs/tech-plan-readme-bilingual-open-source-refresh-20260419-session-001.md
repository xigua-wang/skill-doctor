# Technical Plan

## Metadata

- Topic: readme bilingual open source refresh
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current README has the right facts, but it reads more like an internal project note than a polished open-source entry page. The user wants a higher-quality README with English as the default and a Chinese version available as well.

## Goal

Rewrite the project README to match common open-source project standards, with `README.md` as the English primary document and a separate Chinese version linked from it.

## Non-Goals

- Changing product behavior
- Reworking documentation outside the main README pair

## Proposed Approach

Replace the current `README.md` with a tighter open-source structure: value proposition, highlights, installation, quick start, CLI usage, configuration, architecture, storage model, development workflow, and roadmap. Add `README.zh-CN.md` as the Chinese companion document with the same core information and cross-links between the two files.

## Impacted Files

- `docs/tech-plan-readme-bilingual-open-source-refresh-20260419-session-001.md`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- A more polished README is longer, so sections must stay high-signal.
- The bilingual pair can drift over time if later edits only update one file.

## Validation

- Manual content consistency review
- Confirm commands and paths referenced in the README match the repository

## Open Questions

- Whether to later add screenshots or GIFs once the UI stabilizes further
