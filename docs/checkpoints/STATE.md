# State Checkpoint: india-api-mcp

- **Timestamp:** 2026-11-25T12:02:00+05:30
- **Workspace:** `E:\india-api-mcp`
- **Live Endpoint:** `https://india-api.srigenmedia.com` (`india-api-mcp-edge` v`b9d00c85-4902-441a-8884-ff483c9013ba`)

## Completed
1. Extracted clean GCS source (`220` APIs in `data/india_public_apis.json`; Python reference in `python/`).
2. Implemented modular TypeScript Cloudflare Worker (`src/`, all files `<= 244 LOC`, UTF-8 No-BOM):
   - 9 read-only MCP tools (`readOnlyHint: true`, `204` on `notifications/initialized`) + 2 MCP resources (`india-apis://taxonomy`, `india-apis://catalog`).
   - Public transparency & discoverability: SSR landing (`GET /`) with 17-domain pills summing to `220`, interactive searchable catalog (`GET /catalog`), raw JSON feeds (`GET /catalog.json`, `GET /taxonomy.json`), and GODL-India + Government non-affiliation disclaimer (no Razorpay checkout).
   - Fair-use caps: `30 req/min/IP` (`IP_RATE_LIMITER`), `500/day` atomic D1 OGD cap (`india-api-mcp-quota`, `3cd53c3d-6a3a-4375-b065-08741fbb6d7c`, fail-closed `503`), 24h PIN/IFSC & 6h OGD edge cache.
3. Deployed AWS `ap-south-1` CloudFormation stack `india-api-mcp-ogd-relay` (`nodejs22.x`, `arm64`, `128 MB`, HMAC-SHA256 auth).
4. Directory assets ready: `glama.json`, `/.well-known/glama.json`, `assets/icon.svg`, `README.md`, and `server.json` (`2025-12-11` schema validated `HTTP 200 {"valid":true}`).

## Verified
- `npm run typecheck` + `npm test` (`10/10` passed in `tests/worker.spec.ts` and `tests/negative.security.spec.ts`).
- Live probes on `https://india-api.srigenmedia.com`: `/`, `/catalog`, `/catalog.json`, `/taxonomy.json`, `/health`, `/.well-known/glama.json`, MCP `resources/list` + `resources/read`, and all 9 tools.
- GCP Cloud Run `india-api-mcp` remains `ingress: internal`, `maxScale: 1` (`₹0` GCP cost).

## Pending / Next Actions
- Create public GitHub repo `srigenmedia/india-api-mcp` and `git push -u origin main`.
- Publish `server.json` to Official MCP Registry (`POST /v0.1/publish`) and claim on Glama / Smithery / PulseMCP.
