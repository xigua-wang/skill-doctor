# Skill Doctor PRD

## Product statement

Skill Doctor is a local-first developer tool that makes AI agent skills visible, auditable, and explainable.

## Target user

### Primary
Developers using Codex, Claude Code, GitHub Copilot, or similar coding agents with a mix of global and project-local skills.

### Secondary
Team maintainers who need to review repository skills and prevent collisions with personal setups.

## Core jobs to be done

1. Show me every skill that is available on this machine and in this project.
2. Tell me which one wins when multiple skills overlap.
3. Warn me about duplicate triggers and dangerous commands.
4. Give me a report I can share with teammates.

## MVP scope

### Included
- local and project directory scanning
- skill inventory
- precedence visualization
- conflict detection
- risk scanning
- Markdown and JSON report generation
- local React UI for exploration
- immutable global scan history
- deletion and filtering of past scan records
- mandatory model analysis for each new scan
- bilingual application chrome in English and Simplified Chinese
- project path selection via manual input or home-directory browser with recent paths

### Excluded
- marketplace indexing
- one-click installation
- runtime agent integration
- cloud sync
- full schema normalization across every ecosystem

## Differentiation

This project is not another marketplace or another observability platform.
It focuses on the invisible config layer of agent skills:

- local-first
- workspace-aware
- conflict-oriented
- safety-oriented
- frontend-heavy and demo-friendly

## Success criteria for v0.1

- can scan a real machine without extra dependencies
- can explain at least one real precedence chain
- can produce a useful report even when only system skills are present
- can demo richer conflicts via sample data
- can inspect and revisit prior scan history from the local app
- can switch UI language without leaving the page
