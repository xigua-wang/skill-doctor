# Technical Plan

## Metadata

- Topic: ui drawer readability refresh
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The current page keeps almost every control and data block visible at once. That made early development convenient, but the interaction cost is now too high:

- global settings are always expanded
- history and filtering occupy a full panel even when not in active use
- the page reads like a dashboard wall rather than a focused analysis workspace

The user wants the interface to feel lighter and more readable by moving secondary workflows into click-triggered surfaces such as drawers or modals, especially for global settings and history.

## Goal

Refactor the main page so the primary view focuses on current scan insight and skill inspection, while global settings and history move into explicit overlay surfaces. Improve visual hierarchy and scanability without changing core capabilities.

## Non-Goals

- Rewriting the API or storage model
- Introducing a new frontend dependency for dialogs or drawers

## Proposed Approach

Adopt a more editorial control-bar layout:

- keep a compact top bar with language switch and quick actions
- move settings into a right-side slide-over drawer
- move history into a left-side slide-over drawer
- keep only current summary, analysis, inventory, and selected-skill detail in the main canvas

Improve readability by:

- reducing simultaneous panel density
- grouping related controls into fewer, more intentional sections
- making the selected-skill detail feel like the dominant reading surface
- adding an overlay and close actions so secondary workflows do not compete with the main content

Implement the drawer behavior in local React state and CSS only.

## Impacted Files

- `docs/tech-plan-ui-drawer-and-readability-refresh-20260419-session-001.md`
- `src/App.tsx`
- `src/styles.css`

## Risks And Tradeoffs

- A large `App.tsx` patch increases merge pressure because the page currently contains most UI logic inline.
- Drawer UIs improve focus, but they also hide functionality one level deeper; labels and entry points must stay obvious.
- If spacing and responsive behavior are not tuned carefully, drawers can feel cramped on mobile.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual check: settings are only accessible through a drawer
- Manual check: history is only accessible through a drawer
- Manual check: main page reads clearly without the previous full-wall layout

## Open Questions

- Whether history should later become a full-screen route instead of a drawer
- Whether settings should eventually split into model settings and scan settings
