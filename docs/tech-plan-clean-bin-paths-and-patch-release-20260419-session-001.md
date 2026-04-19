# Technical Plan

## Metadata

- Topic: clean bin paths and patch release
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The npm package is already published successfully, but npm emits a publish-time warning that it auto-corrected the `bin` entries in `package.json`. Investigation showed the warning is caused by the `./lib/...` path format, which npm normalizes to `lib/...`.

## Goal

Eliminate the npm publish warning by aligning the `bin` paths with npm's preferred format and publish a clean patch release.

## Non-Goals

- Changing package behavior
- Renaming the executable commands

## Proposed Approach

Keep the same executable names but remove the leading `./` from the `bin` targets in `package.json`. Bump the package version to `0.1.2`, verify that `npm publish --dry-run` no longer emits the auto-correction warning, then commit, push, and publish the clean patch release.

## Impacted Files

- `docs/tech-plan-clean-bin-paths-and-patch-release-20260419-session-001.md`
- `package.json`
- `package-lock.json`

## Risks And Tradeoffs

- The patch release introduces no runtime risk, but it does add one more public npm version.
- Package consumers may not notice the difference because this change is metadata-only.

## Validation

- `npm run build:package`
- `npm publish --dry-run --access public`
- `git push`
- `npm publish --access public`

## Open Questions

- Whether future releases should also add a changelog entry or GitHub release note for metadata-only fixes
