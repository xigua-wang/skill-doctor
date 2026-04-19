# Technical Plan

## Metadata

- Topic: update github owner links
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

The GitHub repository owner has changed from `xzj-abc` to `xigua-wang`. The project metadata still points to the old repository path, which creates stale links in package metadata and licensing information.

## Goal

Update repository metadata and related ownership references so the project consistently points to `https://github.com/xigua-wang/skill-doctor`.

## Non-Goals

- Changing the npm package scope
- Renaming commands or altering release history

## Proposed Approach

Update the repository, homepage, and bugs URLs in `package.json` to the new GitHub path. Also update the copyright holder string in `LICENSE` to match the new public owner naming used by the user.

## Impacted Files

- `docs/tech-plan-update-github-owner-links-20260419-session-001.md`
- `package.json`
- `LICENSE`

## Risks And Tradeoffs

- Historical planning docs may still mention the old owner name as part of past release context.
- Changing the copyright holder string is a policy choice; it assumes the new public owner name is the desired attribution.

## Validation

- Search the repository for stale `xzj-abc` references
- Verify `package.json` repository metadata points to the new GitHub URL

## Open Questions

- Whether old planning documents should also be rewritten, or left as historical records
