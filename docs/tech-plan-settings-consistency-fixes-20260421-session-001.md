# Technical Plan

## Metadata

- Topic: settings consistency fixes
- Date: 2026-04-21
- Session: 001
- Requested by: user

## Background

The current review identified three behavior inconsistencies that affect user trust in the product:

1. The settings drawer uses uncontrolled fields and an incomplete remount key, so saved values can appear stale until a reload.
2. Connection testing does not reuse the stored API key, which conflicts with the UI copy that says leaving the API key blank preserves the saved key.
3. The frontend request helper discards structured server error messages and can surface raw JSON instead of a clear message.

These issues are small in scope but directly affect first-run confidence and settings usability.

## Goal

Make settings behavior consistent with the UI copy and improve error reporting quality without redesigning the settings architecture.

## Non-Goals

- Converting the settings drawer to a fully controlled React form
- Changing the scan or storage schema

## Proposed Approach

1. Expand the settings form remount key so every settings field that can visibly change after save forces a fresh form instance.
2. Update the connection-test API to merge the submitted partial config with the stored config before testing, so blank API key input still reuses the saved key.
3. Fix the frontend request helper so parsed server `message` and `error` fields are preserved.

## Impacted Files

- `docs/tech-plan-settings-consistency-fixes-20260421-session-001.md`
- `src/App.tsx`
- `scripts/dev-server.ts`

## Risks And Tradeoffs

- Expanding the form remount key is still an uncontrolled-form workaround, not a full architectural fix.
- Reusing the stored API key for connection tests improves consistency, but it also means "test" reflects persisted state plus current visible overrides rather than only the literal submitted form body.

## Validation

- `npm run typecheck`
- `npm run build`
- Manual reasoning review of save-settings and test-connection flows

## Open Questions

- Whether the settings drawer should later move to controlled inputs to remove the need for remount-key management
- Whether the UI should show a more explicit hint that connection tests use the currently saved API key when the field is left blank
