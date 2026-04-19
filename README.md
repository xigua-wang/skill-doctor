<div align="center">

# Skill Doctor

**Audit coding-agent skills like infrastructure, not hidden prompt glue.**

[中文文档](./README.zh-CN.md)

<p>
  <img alt="npm" src="https://img.shields.io/badge/npm-package-161b22?style=for-the-badge&logo=npm&logoColor=white">
  <img alt="react" src="https://img.shields.io/badge/react-ui-161b22?style=for-the-badge&logo=react&logoColor=61dafb">
  <img alt="typescript" src="https://img.shields.io/badge/typescript-core-161b22?style=for-the-badge&logo=typescript&logoColor=3178c6">
  <img alt="local first" src="https://img.shields.io/badge/local--first-workflow-161b22?style=for-the-badge">
  <img alt="bilingual" src="https://img.shields.io/badge/i18n-en%20%7C%20zh--CN-161b22?style=for-the-badge">
</p>

<p>
  Skill Doctor is a local-first inspector for coding-agent skills. It shows what is installed,
  which definition wins, where risk accumulates, and how a workspace behaves across project,
  global, and system scopes.
</p>

</div>

> Skill Doctor makes local skill systems legible. It turns hidden prompt behavior into something you can inspect, compare, and reason about before it surprises you.

## Navigate

- [Highlights](#highlights)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI](#cli)
- [What It Detects](#what-it-detects)
- [Model Analysis](#model-analysis)
- [Architecture](#architecture)
- [Development](#development)

## Highlights

| Inspect | Explain | Operate |
| --- | --- | --- |
| Scans Codex, Claude, Cursor, Copilot, GitHub, and generic skill roots | Shows precedence chains, overrides, duplicate names, and trigger overlap | Stores snapshots and config globally in `~/.skill-doctor/` |
| Flags shell, network, subprocess, secret, and destructive patterns | Adds model-assisted findings on top of local static analysis | Provides a local React UI with history, filtering, deletion, and bilingual support |

## At A Glance

```text
scan local skill roots
        ->
derive precedence, conflicts, and risk signals
        ->
build a structured model-analysis payload
        ->
store immutable snapshots globally
        ->
inspect everything in a local React UI
```

## Why Skill Doctor

As local and project-level agent skills grow, it becomes difficult to answer simple operational questions:

- Which skill is actually active?
- Why did one skill override another?
- Which trigger phrase is ambiguous?
- Which skill definitions deserve closer review?

Skill Doctor treats skills as inspectable infrastructure instead of hidden behavior.

## Installation

### One-line app launch

```bash
npx skill-doctor
```

### Use as an npm package

```bash
npm install -g skill-doctor
skill-doctor
```

Or run it without a global install:

```bash
npx skill-doctor
```

By default, `skill-doctor`:

- uses the current working directory as the default project context
- starts the local UI on `http://localhost:4173`
- attempts to open the browser
- does not run a scan until you trigger one in the UI or pass `--scan`

### Run from this repository

```bash
npm install
npm run build
npm run serve
```

## Quick Start

### Start the local UI

```bash
skill-doctor
```

### Start the UI and run an initial scan

```bash
skill-doctor --scan
```

### Scan a project from the CLI only

```bash
skill-doctor-scan --project /path/to/project
```

### Generate a Markdown report

```bash
skill-doctor-scan --project /path/to/project --markdown ./skill-report.md
```

## Product Surface

| Surface | Purpose |
| --- | --- |
| `skill-doctor` | Starts the local UI for the current project context |
| `skill-doctor --scan` | Starts the UI and performs an initial scan |
| `skill-doctor-scan` | Runs scans without starting the UI |
| React dashboard | History, settings, roots, analysis, and skill inspection |
| Global storage | Config and immutable snapshots outside the target project |

## CLI

### `skill-doctor`

Starts the local web application.

```bash
skill-doctor [--project <path>] [--port <number>] [--app-home <path>] [--no-open] [--scan]
```

Common examples:

```bash
skill-doctor
skill-doctor --scan
skill-doctor --project /path/to/project
skill-doctor --no-open
```

### `skill-doctor-scan`

Runs a scan without starting the UI.

```bash
skill-doctor-scan [--project <path>] [--output <file>] [--markdown <file>] [--analysis-language <en|zh-CN>] [--app-home <path>]
```

Common examples:

```bash
skill-doctor-scan --project .
skill-doctor-scan --project . --output ./scan.json
skill-doctor-scan --project . --markdown ./report.md
skill-doctor-scan --project . --analysis-language zh-CN
```

## What It Detects

- Installed skills across project, global, and system scopes
- Root discovery confidence and discovery method
- Precedence chains and likely winners
- Duplicate normalized skill names
- Trigger overlaps and ambiguous activations
- Static local risk patterns in skill files
- Missing or weak metadata such as absent trigger phrases

## Screenshots

### Overview

The main dashboard is built around a single reading path: current workspace context, top-level metrics, history access, settings, and scan entry points. The hero panel keeps the product value obvious, while the right-hand summary block surfaces the current dataset and key counts without forcing the user into drawers first.

### Analysis And Roots

The analysis view focuses on two things side by side: model-generated findings on the left and concrete scanned roots on the right. This keeps conclusions and evidence in the same viewport, which is especially useful when reviewing multi-agent workspaces with mixed confidence levels across project and global roots.

## Model Analysis

Each new scan includes mandatory model analysis through an OpenAI-compatible `chat/completions` endpoint.

The flow is:

1. Skill Doctor performs a local static scan.
2. It builds a structured compact payload from the scan.
3. It sends that payload to the configured model endpoint.
4. It stores the model summary, findings, recommendations, and spotlights in the snapshot.

Important details:

- Configure `apiKey`, `baseUrl`, and `model` in the UI
- The local scanner ranks skills before sending them to the model
- UI-triggered scans request model output in the current UI language
- CLI scans default to English and support `--analysis-language zh-CN`
- If model config is missing or the provider fails, the scan still completes and records an analysis error

## Storage

Skill Doctor keeps its state outside the inspected project by default:

```bash
~/.skill-doctor/
```

This includes:

- `config.json`
- scan snapshots
- local history used by the UI

## Architecture

Skill Doctor is a local-first application with four runtime layers:

```text
Current project
    |
    v
Root discovery + local static scanner
    |
    +--> precedence / conflicts / risk signals / local priority
    |
    v
Structured analysis payload
    |
    +--> OpenAI-compatible model analysis
    |
    v
Global storage (~/.skill-doctor/)
    |
    +--> config.json
    +--> scan snapshots
    +--> history metadata
    |
    v
Local Node API
    |
    v
React UI
```

### Runtime Layers

- `src-core/scanner/`: discovers roots, parses skills, computes precedence, conflicts, issues, and local risk signals
- `src-core/analysis/`: builds the structured compact payload, calls the configured model endpoint, and normalizes analysis output
- `src-core/storage/`: manages global config and immutable scan snapshots under `~/.skill-doctor/`
- `scripts/dev-server.ts`: serves the built frontend and exposes local APIs for config, scans, history, and directory browsing
- `src/`: renders the React UI for history, settings, scan creation, analysis, and skill inspection

### Data Flow

1. The user opens the local UI with the current directory as the default project context.
2. A scan request triggers root discovery and local static analysis.
3. The scanner builds a typed snapshot and a structured payload for the model.
4. Model analysis returns summary, findings, recommendations, and skill spotlights.
5. The final snapshot is stored in `~/.skill-doctor/` and immediately becomes available in the history-backed UI.

## UI Features

- English and Simplified Chinese interface
- Top-bar language switcher
- History drawer with filtering, deletion, and broken-record handling
- Settings drawer for global model config and extra scan roots
- Project path input and home-directory-based folder picker
- Recent project paths from local history
- Skill detail view with local priority breakdown

## Supported Roots

Built-in discovery currently covers common project and global roots for:

- Codex
- Claude
- Cursor
- Copilot
- GitHub
- generic hidden-agent layouts

You can also define extra absolute scan roots in settings when your environment uses custom paths.

## Demo Workspace

This repository includes a demo workspace for validation:

```bash
examples/demo-workspace/
```

It is useful for testing:

- override behavior
- trigger overlap detection
- high-risk and medium-risk local patterns
- missing metadata issues
- local-priority ranking before model analysis

Run it with:

```bash
npm run scan:demo
```

## Development

Install dependencies:

```bash
npm install
```

Type-check:

```bash
npm run typecheck
```

Build the frontend:

```bash
npm run build
```

Run the local app from the repository:

```bash
npm run serve
```

Build package artifacts:

```bash
npm run build:package
```

## Project Structure

```text
src/          React frontend
src-core/     scanner, analysis, storage, validation
scripts/      CLI and local server entry points
public/       demo data and static assets
docs/         plans, reports, and product notes
examples/     demo workspace for validation
```

## Roadmap

- Per-agent precedence rules instead of a single generic precedence model
- Better diffing across projects or machines
- Stronger repair suggestions and fix generation
- More portable packaging and installation workflows

## License

No license file is included in this repository snapshot yet.
