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

## 220 Indexed APIs by Domain

| Domain | Count |
|---|---|
| BFSI | 19 |
| Governance & Public Services | 19 |
| Mobility & Logistics | 17 |
| DPI / India Stack | 16 |
| Utilities & Telecom | 14 |
| Geo-Spatial, Weather & SpaceTech | 14 |
| Energy & Power | 13 |
| Statistics & Economy | 13 |
| Fintech Middleware (B2B Aggregators) | 13 |
| E-Commerce & ONDC | 12 |
| Open Data & Aggregators | 12 |
| Healthcare | 11 |
| AgriTech | 10 |
| Judiciary & Legal | 10 |
| Aviation | 9 |
| Culture, Language & Media | 9 |
| Education & Skilling | 9 |
| **Total** | **220** |

## Tools & Resources (All Read-Only)

| Tool | Source | Description |
|---|---|---|
| `search_apis` | Offline JSON (220 APIs) | Filter Indian public APIs by keyword, domain, tier, or auth |
| `get_api` | Offline JSON (220 APIs) | Get metadata for an API ID (e.g. `IN-API-0001`) |
| `list_taxonomy` | Offline JSON (220 APIs) | Domain -> sub-domain -> API count taxonomy |
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
