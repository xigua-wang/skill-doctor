# Technical Plan Naming Rule

All new requirement-level technical plans must be created under `docs/`.

## Filename Format

Use this format:

`docs/tech-plan-<topic>-<YYYYMMDD>-session-<session-id>.md`

## Naming Rules

- `tech-plan` is the fixed prefix for every technical plan
- `<topic>` is a short kebab-case summary of the requirement
- `<YYYYMMDD>` is the current local date when the plan is created
- `session` is a fixed separator for readability
- `<session-id>` identifies the planning round and should stay short

## Examples

- `docs/tech-plan-new-skill-doc-rule-20260417-session-001.md`
- `docs/tech-plan-scan-history-ui-20260417-session-alpha.md`
- `docs/tech-plan-config-storage-refactor-20260417-session-002.md`

## Usage Notes

- Create a new file for each new requirement or planning round
- Do not overwrite the generic strategy document `docs/technical-plan.md`
- Prefer numeric session ids when the same topic is revised multiple times
