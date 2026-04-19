# Technical Plan

## Metadata

- Topic: readme screenshots and architecture
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The README was rewritten into English and Chinese open-source style documents, but it still lacks two pieces that help readers understand the product quickly: a screenshot-oriented overview section and a clear architecture explanation.

## Goal

Add screenshot-oriented README content and a concise architecture section that explains how scanning, storage, model analysis, and the local UI fit together.

## Non-Goals

- Changing the application UI itself
- Adding binary screenshot assets to the repository in this iteration

## Proposed Approach

Extend both README files with:

- a `Screenshots` section that describes the supplied UI views and provides ready-to-link captions
- an `Architecture` section with a compact text diagram and a short explanation of each runtime layer

Use a text-first diagram so the README stays useful even before screenshot assets are committed into the repository.

## Impacted Files

- `docs/tech-plan-readme-screenshots-and-architecture-20260419-session-001.md`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- Without committed image assets, the screenshot section must rely on descriptive captions instead of inline repository images.
- The architecture section should stay compact; too much implementation detail would weaken README readability.

## Validation

- Manual README content review
- Confirm architecture wording matches the current codebase structure

## Open Questions

- Whether to later add committed PNG assets under `docs/images/`
