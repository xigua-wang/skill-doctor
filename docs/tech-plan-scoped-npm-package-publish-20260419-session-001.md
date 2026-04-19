# Technical Plan

## Metadata

- Topic: scoped npm package publish
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

Publishing the unscoped package name `skill-doctor` failed because the current npm account does not have permission to publish that package name. The user wants to continue by switching to a scoped package name and retrying publication.

## Goal

Rename the npm package to a scope owned by the current account and publish the initial public release successfully.

## Non-Goals

- Changing the CLI command names
- Redesigning package contents or release automation

## Proposed Approach

Switch `package.json` from `skill-doctor` to `@xzj-abc/skill-doctor`, keep the executable names `skill-doctor` and `skill-doctor-scan`, update README installation examples, and publish with `npm publish --access public`.

## Impacted Files

- `docs/tech-plan-scoped-npm-package-publish-20260419-session-001.md`
- `package.json`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- Installation commands become slightly longer because the package is scoped.
- Existing references to the unscoped package name must be updated to avoid confusion.

## Validation

- `npm pack --dry-run`
- `npm publish --dry-run --access public`
- `npm publish --access public`

## Open Questions

- Whether future branding should also align the package name and executable names more closely
