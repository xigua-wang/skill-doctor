# Changelog

All notable changes to this project are documented in this file.

The project is evolving quickly, so the first entries summarize milestone snapshots rather than a long historical release train.

## [0.1.2] - 2026-04-19

### Changed

- Normalized npm `bin` paths to remove publish-time auto-correction warnings
- Published a clean patch release for the scoped npm package

## [0.1.1] - 2026-04-19

### Changed

- Moved the npm package to the scoped name `@xiguawang/skill-doctor`
- Updated repository metadata and installation examples to the new package identity
- Synced GitHub package metadata to the new repository owner path

## [0.1.0] - 2026-04-19

### Added

- Typed scanner core for root discovery, precedence analysis, conflict detection, and local risk inspection
- Local React UI with history, filtering, settings, path selection, and skill detail inspection
- Mandatory model-assisted analysis with structured prompt input and normalized output
- English and Simplified Chinese UI support
- Global storage under `~/.skill-doctor/` for config and immutable scan snapshots
- npm package distribution with `skill-doctor` and `skill-doctor-scan` executables

### Changed

- Default local server binding was tightened to `127.0.0.1`
- Config APIs stopped returning plaintext stored API keys
- Connection testing was restricted so saved secrets are not reused against arbitrary caller-supplied endpoints
