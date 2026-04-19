# Technical Plan

## Metadata

- Topic: i18n language switch
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current React frontend is entirely hard-coded in English. The new requirement is to support both English and Chinese, default to English, and let the user switch languages freely from the top of the page.

This is a UI-layer concern first. The scanner, storage, and API payloads can remain unchanged for this iteration because they already provide machine-readable data. The largest surface area is `src/App.tsx`, which currently contains almost all user-facing copy inline.

## Goal

Add lightweight i18n to the React UI so the page supports English and Chinese, defaults to English, and exposes a top-level language switcher.

## Non-Goals

- Translating scan data coming from user content, skill descriptions, or model output
- Adding a third-party i18n framework or runtime dependency

## Proposed Approach

Introduce a small in-repo dictionary for `en` and `zh-CN`, then route UI copy through a translation helper. Keep the implementation local and explicit instead of pulling in a library.

Persist the selected language in `localStorage` so the preference survives reloads. Default to English when no preference exists or when stored data is invalid. Add a language switch control in the top area of the page so it is always visible.

Only translate application chrome and static labels in this iteration:

- hero copy
- panel headings
- buttons
- settings labels
- history filters
- detail and empty-state copy
- status and analysis messages that are produced by the app itself

Dynamic scan content such as skill descriptions, file paths, and model-generated analysis text will remain as-is.

## Impacted Files

- `docs/tech-plan-i18n-language-switch-20260419-session-001.md`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- `src/App.tsx` currently contains a lot of inline copy, so the first i18n pass will touch many lines and can create merge pressure.
- A local dictionary is simple and dependency-free, but it does not provide pluralization or advanced formatting helpers.
- Some strings that combine translated copy with runtime values may still sound slightly mechanical until a later refinement pass.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: first load defaults to English
- Manual check: top switch changes between English and Chinese without reloading
- Manual check: selected language persists after refresh

## Open Questions

- Whether a future iteration should expose language selection in global config instead of browser local storage
- Whether reports and generated markdown should eventually support localization too
