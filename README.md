# India Public APIs MCP

Free, read-only Streamable HTTP Model Context Protocol (MCP) server operated by **SriGenMedia (Bengaluru, India)** at `https://india-api.srigenmedia.com/mcp`.

- **Interactive Catalog:** [https://india-api.srigenmedia.com/catalog](https://india-api.srigenmedia.com/catalog)
- **Raw Catalog JSON:** [https://india-api.srigenmedia.com/catalog.json](https://india-api.srigenmedia.com/catalog.json)
- **Taxonomy JSON:** [https://india-api.srigenmedia.com/taxonomy.json](https://india-api.srigenmedia.com/taxonomy.json)

> **Government Non-Affiliation & GODL-India Attribution:** Independent private MCP server using publicly licensed Open Government Data (`data.gov.in`, GODL-India) and public APIs (India Post PIN/DIGIPIN, Razorpay IFSC). Not affiliated with, endorsed by, or representing NIC, India Post, UIDAI, RBI, or the Government of India.

## Connect

```json
{
  "mcpServers": {
    "india-public-apis": {
      "url": "https://india-api.srigenmedia.com/mcp"
    }
  }
}
```

## 246 Indexed APIs by Domain

| Domain | Count |
|---|---|
| BFSI | 27 |
| Governance & Public Services | 23 |
| Geo-Spatial, Weather & SpaceTech | 17 |
| Mobility & Logistics | 17 |
| DPI / India Stack | 16 |
| Utilities & Telecom | 15 |
| Open Data & Aggregators | 14 |
| Statistics & Economy | 14 |
| Energy & Power | 13 |
| Fintech Middleware (B2B Aggregators) | 13 |
| E-Commerce & ONDC | 12 |
| Education & Skilling | 12 |
| Healthcare | 12 |
| Culture, Language & Media | 11 |
| Judiciary & Legal | 11 |
| AgriTech | 10 |
| Aviation | 9 |
| **Total** | **246** |

## Tools & Resources (All Read-Only)

| Tool | Source | Description |
|---|---|---|
| `search_apis` | Offline JSON (246 APIs) | Filter Indian public APIs by keyword, domain, tier, or auth |
| `get_api` | Offline JSON (246 APIs) | Get metadata for an API ID (e.g. `IN-API-0001`) |
| `list_taxonomy` | Offline JSON (246 APIs) | Domain -> sub-domain -> API count taxonomy |
| `digipin_encode` | Local Math | Encode lat/lon into 10-character India Post DIGIPIN |
| `digipin_decode` | Local Math | Decode DIGIPIN back to ~4m cell centre coordinates |
| `pincode_lookup` | India Post (24h cache) | Post offices, district, and state for a 6-digit PIN |
| `ifsc_lookup` | Razorpay IFSC (24h cache) | Bank, branch, address, and supported rails |
| `ogd_dataset_query` | `data.gov.in` (6h cache) | Query any OGD resource UUID (via signed `ap-south-1` relay) |
| `mandi_prices` | `data.gov.in` (6h cache) | Daily Agmarknet mandi commodity prices |

MCP Resources: `india-apis://taxonomy`, `india-apis://catalog`.

## Fair-Use Caps & Edge Caching

- **Per-IP Rate Limit:** `30` requests/minute on `POST /mcp` (`IP_RATE_LIMITER`).
- **OGD Daily Cap:** `500` uncached `api.data.gov.in` upstream calls/day globally (`D1` atomic counter). Offline catalog, DIGIPIN, PIN, IFSC, and edge-cached OGD responses remain available even if the daily OGD cap is reached.
- **Edge Cache TTLs:** `24h` for PIN/IFSC; `6h` for OGD queries.
- **Local Python Reference:** Kept in `python/` for stdio/local testing (`python/server.py`, `python/bridge_stdio.py`).

## Production Quota, Custom India DPI MCPs & SriGenMedia Pillars

Need higher limits (`>30 rpm` / `>500/day` OGD upstream), private `ap-south-1` VPC deployment, or custom production MCPs for Partner-tier Indian DPIs (Aadhaar, Account Aggregator, GSTN, ULIP, ABDM, ULI)?

- **Forward-Deployed Engineering & Dedicated Quota:** [fde.srigenmedia.com](https://fde.srigenmedia.com/?utm_source=india-api-mcp&utm_medium=readme&utm_campaign=dedicated_quota) · [SriGenMedia Platform](https://srigenmedia.com/?utm_source=india-api-mcp&utm_medium=readme)
- **GitHub Forms:** [Request Dedicated Quota / FDE Inquiry](https://github.com/srigenmedia/india-api-mcp/issues/new?template=dedicated-quota.yml) · [Request a Missing Indian API](https://github.com/srigenmedia/india-api-mcp/issues/new?template=api-request.yml)
- **Production Pillars:**
  - [SovereignRoute](https://route.srigenmedia.com/?utm_source=india-api-mcp&utm_medium=readme) — DPDP / RBI compliant LLM & data routing
  - [Kavach KYA](https://kavach.srigenmedia.com/?utm_source=india-api-mcp&utm_medium=readme) — Agent identity, spend policies & verifiable audit trails
  - [402-in-a-Box](https://vashishta.srigenmedia.com/developers/402?utm_source=india-api-mcp&utm_medium=readme) — HTTP 402 pay-per-call API & MCP monetization
  - [CraftCI](https://craft.srigenmedia.com/?utm_source=india-api-mcp&utm_medium=readme) — Deterministic MCP security & CI verification gates
