# Demo Workspace

This workspace exists to validate Skill Doctor features against a real directory layout.

## Included scenarios

- duplicate Codex skill names to trigger precedence-chain and override analysis
- trigger overlap across multiple Codex skills
- high-risk shell patterns such as `curl | bash` and `rm -rf`
- medium-risk shell and network execution patterns
- low-risk secret or token references
- missing trigger extraction to generate local issues
- mixed agents across `.codex`, `.claude`, `.agents`, `.copilot`, and `.github`
- OpenClaw precedence across `skills/`, project `.agents/skills`, home `.agents/skills`, managed `~/.openclaw/skills`, and config-driven `extraDirs`

## Run it

From the repository root:

```bash
npm run scan:demo
```

For the OpenClaw-specific fixture:

```bash
npm run scan:demo:openclaw
```

Or explicitly:

```bash
npm run scan -- --project ./examples/demo-workspace
```

```bash
node --import tsx ./scripts/scan-skills.ts --project ./examples/demo-workspace --home ./examples/demo-home --app-home ./.tmp/demo-openclaw-app-home
```

## Expected outcomes

- `Release Guard` appears more than once for Codex, so override and precedence-chain output should appear.
- `release` and `deploy` triggers overlap across Codex skills.
- `incident-cleanup` contains `rm -rf`.
- `release-guard` contains `curl | bash` plus secret-env references.
- `workflow-surgeon` contains subprocess usage.
- `api-triage` contains network fetch logic.
- `copilot/skills/doc-gateway` is missing a trigger section, so it should produce an issue.
- In the OpenClaw fixture, `Release Guard` should resolve in this order: `skills/` > project `.agents/skills` > home `.agents/skills` > `~/.openclaw/skills` > `skills.load.extraDirs`.
