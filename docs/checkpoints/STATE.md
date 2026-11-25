# State Checkpoint: india-api-mcp

- **Timestamp:** 2026-11-25T12:34:00+05:30
- **Workspace:** `E:\india-api-mcp`
- **Version:** `0.2.0`
- **Live Endpoint:** `https://india-api.srigenmedia.com` (`india-api-mcp-edge`)

## Completed
1. Refreshed and expanded `data/india_public_apis.json` from `220` to **`246`** grounded Indian public APIs (`IN-API-0001..IN-API-0246`, `0` `http://` links) with dynamic runtime counts.
2. Added concrete lead-capture & demand-telemetry surfaces (`src/*.ts` all `<= 244 LOC`, zero PII stored):
   - SSR Landing (`GET /`) & Catalog (`GET /catalog`) CTAs (`srigenmedia.com/contact?utm_source=india-api-mcp`), GitHub API-request links, and UTM-tagged pillar links (`SovereignRoute`, `Kavach KYA`, `402-in-a-Box`, `CraftCI`).
   - Actionable `429` upgrade hints in `src/quota.ts` and privacy-safe `rpc_method`/`tool` telemetry in `src/mcp.ts` + `src/index.ts`.
   - GitHub Issue Forms (`.github/ISSUE_TEMPLATE/dedicated-quota.yml`, `api-request.yml`) and `README.md` updates.
3. Scrubbed `python/` references to default to `https://india-api.srigenmedia.com/mcp` via `INDIA_API_MCP_URL` and bumped release metadata to `v0.2.0` (`server.json`, `package.json`, `package-lock.json`, `src/mcp.ts`).

## Verified
- Pre-release secret/leak scan (`0` hits), `npm run typecheck`, `npm test`, `python -m pytest python/tests/test_tools.py`, and `mcp-publisher validate`.
