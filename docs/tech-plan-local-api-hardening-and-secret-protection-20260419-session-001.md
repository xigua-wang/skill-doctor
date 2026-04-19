# Technical Plan

## Metadata

- Topic: local api hardening and secret protection
- Date: 2026-04-19
- Session: 001
- Requested by: user

## Background

A security review of the current local server identified three meaningful risks:

1. the local HTTP server listens on all interfaces by default
2. sensitive APIs are exposed without any authentication
3. the model connection test path can combine a stored API key with a caller-supplied `baseUrl`, which creates a real secret exfiltration path

The user asked whether fixing these issues would affect product behavior and requested a technical plan before implementation.

## Goal

Harden the local API so secrets and local filesystem metadata are not exposed by default, while keeping the product usable as a local-first desktop-style tool.

## Non-Goals

- Building a full multi-user auth system
- Supporting arbitrary remote access by default
- Redesigning the scan or storage model

## Proposed Approach

Implement the hardening in two phases so the highest-risk issues are removed first without blocking the core workflow.

### Phase 1: Immediate Risk Reduction

1. Bind the local server to `127.0.0.1` by default
   - Add an explicit `--host` option for advanced cases
   - Keep `127.0.0.1` as the default safe behavior

2. Stop returning plaintext `apiKey` from `/api/config`
   - Replace it with derived state such as:
     - `hasApiKey: boolean`
     - optional masked hint like `sk-***abcd`
   - Update the settings UI to show configured state instead of auto-filling the full key

3. Close the connection-test secret exfiltration path
   - Do not allow the request body to override `baseUrl` while silently inheriting the stored `apiKey`
   - Require the test to use one coherent config set from the same request, or only test the already stored config
   - Prefer treating the test payload as complete, not as a patch merged with stored secrets

### Phase 2: Local API Hardening

4. Add a local session token for sensitive API calls
   - Generate a random token at server startup
   - Expose it to the served frontend through server-rendered bootstrap data or a dedicated local-only initialization path
   - Require it on:
     - `/api/config`
     - `/api/config/test-connection`
     - `/api/scans`
     - `/api/scans/:id` delete
     - `/api/fs/directories`

5. Narrow filesystem access semantics
   - Keep `/api/fs/directories` restricted to the home directory by default
   - Decide whether `/api/scans` should only allow:
     - the current project
     - the home directory
     - explicitly selected user paths
   - Preserve current UX for the path picker while reducing “arbitrary path proxy” behavior

6. Add clearer operational modes
   - Safe default: localhost only
   - Explicit advanced mode: `--host 0.0.0.0`
   - If remote host binding is used, print a warning that the local API is now exposed beyond the machine

## Expected Product Impact

These fixes do affect behavior, but in controlled ways:

1. Localhost-only binding
   - Impact: other devices on the LAN cannot open the UI by default
   - Benefit: removes passive LAN exposure

2. No plaintext API key in config responses
   - Impact: settings form cannot auto-fill the saved key
   - Benefit: the key is no longer retrievable from the browser API

3. Stricter connection testing
   - Impact: users may need to enter a complete config set before testing
   - Benefit: prevents stored secret reuse against attacker-controlled endpoints

4. Session token requirement
   - Impact: frontend requests need one extra bootstrap step
   - Benefit: blocks unauthenticated API access from outside the app

Overall, these changes do not remove core functionality. They mostly convert unsafe implicit behavior into explicit or opt-in behavior.

## UI / UX Adjustments

- Settings drawer should show:
  - API key configured / not configured
  - optional masked suffix instead of the full key
- Testing connection should clearly communicate:
  - whether it is testing the saved config
  - or a newly entered config set
- If localhost-only mode is active, the README and help text should describe how to opt into remote host binding

## Impacted Files

- `docs/tech-plan-local-api-hardening-and-secret-protection-20260419-session-001.md`
- `scripts/dev-server.ts`
- `src/App.tsx`
- `src-core/storage/config-store.ts`
- `src-core/types.ts`
- `src-core/analysis/analyze-scan.ts`
- `README.md`
- `README.zh-CN.md`

## Risks And Tradeoffs

- The settings experience becomes slightly less convenient because the saved API key is no longer round-trippable to the client
- Token-based protection adds more moving parts between the server and frontend
- Users who relied on LAN access will need an explicit host flag

## Validation

- Verify the server binds to `127.0.0.1` by default
- Verify `/api/config` no longer returns plaintext `apiKey`
- Verify connection testing cannot send a stored key to a caller-supplied `baseUrl`
- Verify the frontend can still save config, test connection, run scans, and browse directories
- Verify explicit remote host mode still works when intentionally enabled

## Open Questions

- Whether the scan API should be restricted to the current project by default, with an explicit override for arbitrary paths
- Whether the session token should persist for the lifetime of the process only, or across restarts
