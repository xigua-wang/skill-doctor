# Skill Doctor Architecture: Global Storage, History, and React App Plan

## Background

The current implementation proves the core scan idea, but it still behaves like a demo:

- scan artifacts are written into the current project
- the UI is static and read-only
- there is no history, deletion, or search across past scans
- model and API settings are not configurable
- scanner root detection assumes fixed directories with limited tolerance

This document defines the next technical direction for Skill Doctor.

## Goals

1. Move operational data out of the inspected project and into a global hidden directory.
2. Upgrade the local UI into a real application suitable for ongoing use.
3. Add scan history with list, query, detail, and delete capabilities.
4. Add global configuration for API key, base URL, and model selection.
5. Make agent root discovery more fault-tolerant across Codex, Claude, Agents, Copilot, and GitHub-related layouts.

## Non-Goals

- Cloud sync
- Multi-user account system
- Full live integration into every agent runtime
- Perfect auto-discovery for every unofficial tool distribution on day one

## Product Direction

Skill Doctor should evolve from a single-shot scanner into a local desktop-style inspector:

- one global data home
- one local web app
- one historical record of scans
- one configuration layer shared across projects

The inspected repository should be treated as read-only input, not as the storage location for application state.

## Proposed Storage Architecture

### Global application home

Use a hidden directory under the user home directory:

`~/.skill-doctor/`

Recommended layout:

```text
~/.skill-doctor/
  config.json
  scans/
    2026-04-17T10-22-31-123Z--skill-doctor.json
  cache/
  logs/
  exports/
```

### Why this layout

- avoids polluting the target repository
- allows cross-project history
- supports future migration, export, and cleanup
- separates persistent config from generated scan results

### Data ownership rule

- project directories are scan targets only
- `~/.skill-doctor/` is the only write location for operational records

## Scan Record Model

Each scan file should be a complete immutable snapshot.

Suggested top-level schema:

```json
{
  "id": "2026-04-17T10-22-31-123Z--skill-doctor",
  "generatedAt": "2026-04-17T10:22:31.123Z",
  "project": {
    "name": "skill-doctor",
    "path": "/abs/path/to/project"
  },
  "scanner": {
    "version": "0.2.0",
    "rootsStrategy": "known-paths-plus-fallbacks"
  },
  "config": {
    "model": "gpt-5.4",
    "baseUrl": "https://api.openai.com/v1",
    "provider": "openai"
  },
  "summary": {},
  "roots": [],
  "conflicts": [],
  "resolutionChains": [],
  "skills": []
}
```

### History index strategy

Two implementation options:

1. Directory-as-index
   Read `~/.skill-doctor/scans/*.json` and sort by timestamp.
2. Manifest index
   Maintain `~/.skill-doctor/scans/index.json` for faster listing.

Recommendation:

Start with directory-as-index for simplicity. Add manifest caching only if scan history grows enough to affect UI load time.

## Configuration Model

Use a global config file:

`~/.skill-doctor/config.json`

Suggested schema:

```json
{
  "apiKey": "",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-5.4",
  "provider": "openai",
  "scan": {
    "maxDepth": 5,
    "includeProjectRoots": true,
    "includeGlobalRoots": true,
    "enableFallbackDiscovery": true
  }
}
```

### Security notes

- API key is stored locally only
- UI should mask the key by default
- if later needed, API key storage can be upgraded to OS keychain integration
- initial version can use plain local file storage, but the risk should be documented

## Root Discovery Strategy

## Known confirmed paths

The current evidence is strongest for Codex:

- global: `~/.codex/skills`
- project: `<project>/.codex/skills`

The others should not be treated as equally certain without tolerance handling.

### Candidate paths by ecosystem

Codex:

- `~/.codex/skills`
- `<project>/.codex/skills`

Claude:

- `~/.claude/skills`
- `<project>/.claude/skills`

Generic agents:

- `~/.agents/skills`
- `<project>/.agents/skills`

GitHub / Copilot related:

- `<project>/.github/skills`
- `~/.copilot/skills`
- `<project>/.copilot/skills`

### Recommended design

Do not model these as hard truths only. Model them as discovery candidates with confidence.

Suggested root descriptor:

```json
{
  "agent": "claude",
  "label": "Claude Global",
  "path": "/Users/name/.claude/skills",
  "scope": "global",
  "confidence": "candidate",
  "exists": true,
  "discoveryMethod": "well-known-path"
}
```

### Discovery phases

1. Well-known path scan
   Check documented or strongly expected locations first.
2. Workspace fallback scan
   Search for shallow hidden directories such as `.codex`, `.claude`, `.agents`, `.copilot`, `.github` and inspect likely skill subpaths.
3. Signature-based validation
   Only accept a folder as a skill root if it contains `SKILL.md` descendants or other recognizable skill metadata.
4. Reporting with confidence
   Surface whether a root is confirmed, inferred, or missing.

### Tolerance rules

- missing directories are normal and should not be treated as errors
- ambiguous directories should be shown as inferred, not confirmed
- unsupported tool layouts should be logged in the scan metadata for future rule updates

## UI Architecture

## Framework choice

Move from static DOM scripting to React.

Recommended stack:

- React
- Vite
- zero or minimal additional dependencies

### Why React is justified now

- the app now needs multiple stateful panels
- history, filtering, deletion, and config editing require richer state flow
- the existing static page will become difficult to extend safely

## App structure

Suggested modules:

```text
src/
  main.jsx
  App.jsx
  components/
    dashboard/
    history/
    settings/
    scan-detail/
  hooks/
    useScanHistory.js
    useConfig.js
  lib/
    api.js
    formatters.js
  styles/
```

### UI sections

1. Dashboard
   Show the latest scan, summary metrics, roots, conflicts, chains, and skill details.
2. History
   Show all past scans with search by project name, path, date, agent, and keyword.
3. Settings
   Edit API key, base URL, provider, model, and scan options.
4. Scan detail
   Open any historical scan as a read-only detail view.

### Required interactions

- select a historical record
- search scan history
- delete one record
- bulk delete selected records
- save configuration
- run a new scan and append a new history record

## Local Runtime Architecture

The current static server is not enough for history deletion and config writes.

Recommended runtime split:

- Node backend for filesystem reads and writes
- React frontend for the local app UI

### Backend options

1. Lightweight custom Node server
2. Express-style server

Recommendation:

Use Node built-in `http` or a very small server layer first to preserve the low-dependency posture.

### Suggested API surface

```text
GET    /api/config
PUT    /api/config
GET    /api/scans
GET    /api/scans/:id
DELETE /api/scans/:id
POST   /api/scans
```

`POST /api/scans` should:

- read config
- resolve scan target path
- run the scanner
- persist a new snapshot under `~/.skill-doctor/scans/`
- return the created record

## Scanner Refactor

The scanner should be split into reusable modules instead of staying as a single CLI-only script.

Suggested decomposition:

```text
scripts/
  scan-skills.mjs          # CLI entry
src-core/
  scanner/
    discover-roots.mjs
    collect-skill.mjs
    detect-conflicts.mjs
    summarize.mjs
  storage/
    app-home.mjs
    config-store.mjs
    scan-store.mjs
```

### Benefits

- CLI and local server can share the same scan engine
- easier to test root discovery and storage logic
- easier to add future providers or schema variants

## Search and Delete Semantics

## History search

Support filtering by:

- project name
- project path
- date range
- agent
- risk level
- free-text keyword

The first version can search by in-memory filtering after loading scan metadata.

## Delete behavior

Deletion should remove only the stored snapshot under `~/.skill-doctor/scans/`.

Rules:

- deleting history must never touch the scanned project
- delete actions should require explicit confirmation in the UI
- latest scan view should automatically rebind to the next newest record if the active one is deleted

## Compatibility and Error Handling

### Expected failures

- candidate tool directories do not exist
- path exists but contains no valid skills
- malformed `SKILL.md`
- unreadable files
- invalid stored config
- partially written scan record

### Required handling

- never crash the UI because one scan record is malformed
- mark unreadable records as broken and allow deletion
- validate config before saving
- write scan files atomically using temp file then rename

## Migration Plan

## Phase 1

- create `~/.skill-doctor/`
- move generated scan output to the global store
- keep current CLI working

## Phase 2

- extract scanner core modules
- add config store
- add scan history store

## Phase 3

- introduce React app and local Node API
- implement history list, search, detail, and delete

## Phase 4

- improve discovery confidence reporting
- add provider-specific scanning heuristics

## Open Questions

1. Whether API-driven model analysis is required for every scan, or only for optional enhanced analysis.
2. Whether API keys should remain in plain local config for v0.2 or move directly to OS keychain storage.
3. Whether GitHub and Copilot should be modeled as separate ecosystems or partially overlapping root families.
4. Whether scan history should store full snapshots only, or also maintain a compact metadata index.

## Recommended Immediate Next Step

Implement Phase 1 and Phase 2 first:

- global app home
- config store
- scan history persistence
- scanner modularization

Then build the React UI on top of a stable local storage and API layer.
