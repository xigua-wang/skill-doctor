# Release Checklist

Use this checklist before publishing a new version of `@xiguawang/skill-doctor`.

## 1. Prepare Changes

- Confirm the working tree is in the state you want to release
- Update docs if the change affects:
  - install commands
  - behavior defaults
  - security boundaries
  - release notes
- Add or update a tech-plan document if the change is non-trivial

## 2. Update Version Metadata

- Bump `package.json` version
- Bump `package-lock.json` version
- Add a new entry to `CHANGELOG.md`

## 3. Validate Locally

Run:

```bash
npm run typecheck
npm run build
npm run build:package
```

If the release changes scanner behavior, also run:

```bash
npm run scan
```

If the release changes demo behavior, also run:

```bash
npm run scan:demo
```

## 4. Verify Package Contents

Run:

```bash
npm publish --dry-run --access public
```

Check:

- package name
- version
- tarball contents
- no unexpected warnings

## 5. Commit And Push

Typical flow:

```bash
git add .
git commit -m "Release x.y.z"
git push origin main
```

## 6. Publish To npm

Run:

```bash
npm publish --access public
```

Current package:

```bash
@xiguawang/skill-doctor
```

## 7. Post-Release Verification

Verify:

- npm package page shows the new version
- install command works:

```bash
npm install -g @xiguawang/skill-doctor
skill-doctor --help
```

- `npx` works:

```bash
npx --package @xiguawang/skill-doctor skill-doctor --help
```

## 8. Optional Follow-up

- create or update GitHub Release notes
- update screenshots if the UI changed
- update GitHub About / Topics if positioning changed
