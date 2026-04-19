# Security Policy

## Supported Scope

Skill Doctor is a local-first tool that:

- scans local skill directories
- stores snapshots and config under `~/.skill-doctor/`
- optionally calls an OpenAI-compatible model endpoint using user-supplied credentials

It is designed for local workstation use, not as a multi-user network service.

## Reporting A Vulnerability

If you find a security issue, please do not open a public issue with exploit details first.

Instead, report it privately to the maintainer through one of these paths:

- GitHub security advisory flow, if enabled for the repository
- a private maintainer contact channel you already have

If no private channel is available, open a minimal GitHub issue without exploit details and request a private contact path.

## Current Security Boundaries

The current project intentionally follows these defaults:

- the local server binds to `127.0.0.1` by default
- stored API keys are not returned in plaintext through the config API
- model connection tests do not reuse a stored secret against an arbitrary caller-supplied endpoint

## Important Limitations

Skill Doctor is not a hardened multi-user service.

You should assume:

- if you deliberately expose the local server beyond localhost, you are expanding the trust boundary
- if you scan sensitive directories, metadata from those directories may appear in local snapshots
- if you configure a third-party model endpoint, request content is sent to that endpoint during model analysis

## Safe Usage Recommendations

- keep the default localhost binding unless you explicitly need remote access
- treat configured model credentials as sensitive local secrets
- review custom scan roots carefully before adding them
- use trusted model providers and endpoints

## Security Fix Policy

Security fixes may be released as patch versions even when they introduce small behavior changes, especially if the change tightens unsafe defaults.
