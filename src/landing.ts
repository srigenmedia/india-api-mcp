import { CATALOG, listTaxonomy } from "./catalog";

const SNIPPET = `{
  "mcpServers": {
    "india-public-apis": {
      "url": "https://india-api.srigenmedia.com/mcp"
    }
  }
}`;

function esc(val: string): string {
  return val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderDomainPills(): string {
  const tax = listTaxonomy();
  const entries = Object.entries(tax)
    .map(([domain, subs]) => ({
      domain,
      count: Object.values(subs).reduce((acc, n) => acc + n, 0)
    }))
    .sort((a, b) => b.count - a.count);

  return entries
    .map(
      (e) =>
        `<a class="dpill" href="/catalog?domain=${encodeURIComponent(e.domain)}"><span>${esc(e.domain)}</span><strong>${e.count}</strong></a>`
    )
    .join("");
}

/** Render pre-login SSR HTML landing page for india-api.srigenmedia.com. */
export function renderLandingHtml(): string {
  const total = CATALOG.length;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>India Public APIs MCP — SriGenMedia</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0f172a; color: #f8fafc; line-height: 1.6; }
    main { max-width: 980px; margin: 0 auto; padding: 2rem 1.25rem 3.5rem; }
    header { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1.25rem; }
    svg { max-width: 100%; display: inline-block; vertical-align: middle; }
    svg:not([width]) { width: 1.25rem; height: 1.25rem; }
    .badge { display: inline-block; background: #065f46; color: #ffffff; padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
    .notice { background: #1e293b; border-left: 4px solid #f59e0b; padding: 1rem 1.15rem; border-radius: 0.5rem; margin: 1.25rem 0; color: #e2e8f0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 0.65rem; padding: 1rem 1.15rem; }
    .domains { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0 1rem; }
    .dpill { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.35rem 0.7rem; border-radius: 999px; background: #1e293b; border: 1px solid #475569; color: #f8fafc; text-decoration: none; font-size: 0.85rem; }
    .dpill strong { color: #7dd3fc; font-variant-numeric: tabular-nums; }
    h1 { font-size: 1.75rem; margin: 0; }
    h2 { font-size: 1.2rem; margin: 1.8rem 0 0.75rem; color: #93c5fd; }
    pre { background: #020617; border: 1px solid #334155; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; color: #e2e8f0; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.92rem; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #334155; }
    th { color: #cbd5e1; background: #1e293b; }
    code { color: #fde68a; }
    a { color: #7dd3fc; }
    .links { display: flex; flex-wrap: wrap; gap: 0.85rem; margin-top: 1.25rem; }
    .cta { background: #1e293b; border: 1px solid #10b981; border-radius: 0.65rem; padding: 1.15rem 1.25rem; margin: 1.75rem 0 1.25rem; }
    .cta h2 { margin-top: 0; color: #6ee7b7; }
    .btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 1rem; border-radius: 0.5rem; background: #065f46; color: #ffffff; text-decoration: none; font-weight: 600; }
    .btn.sec { background: #1e293b; border: 1px solid #475569; }
    footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #334155; color: #94a3b8; font-size: 0.88rem; }
  </style>
</head>
<body>
  <main>
    <header>
      <svg width="44" height="44" viewBox="0 0 128 128" role="img" aria-label="India Public APIs MCP logo">
        <rect width="128" height="128" rx="24" fill="#1e293b" stroke="#38bdf8" stroke-width="4" />
        <path d="M24 42h80v14H24z" fill="#f97316" />
        <path d="M24 57h80v14H24z" fill="#f8fafc" />
        <path d="M24 72h80v14H24z" fill="#10b981" />
        <circle cx="64" cy="64" r="6" fill="#1d4ed8" />
      </svg>
      <div>
        <span class="badge">Free Read-Only Streamable HTTP MCP</span>
        <h1>India Public APIs MCP</h1>
      </div>
    </header>

    <p>Hosted Model Context Protocol server exposing an offline catalog of <strong>${total} Indian public APIs</strong>, India Post <strong>PIN</strong> &amp; <strong>DIGIPIN</strong> utilities, bank <strong>IFSC</strong> lookup, and <strong>data.gov.in</strong> OGD / mandi price queries.</p>

    <div class="links">
      <a class="btn" href="/catalog">Browse All ${total} APIs &rarr;</a>
      <a class="btn sec" href="/catalog.json">catalog.json</a>
      <a class="btn sec" href="/taxonomy.json">taxonomy.json</a>
    </div>

    <section class="notice" aria-label="GODL-India Attribution and Non-Affiliation Disclaimer">
      <strong>Government Non-Affiliation &amp; GODL-India Attribution:</strong> Independent private MCP server operated by <strong>SriGenMedia (Bengaluru, India)</strong> using publicly licensed Open Government Data (<code>data.gov.in</code>, <a href="https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf" rel="noopener">GODL-India</a>) and public APIs (India Post PIN/DIGIPIN, Razorpay IFSC). <strong>Not affiliated with, endorsed by, or representing NIC, India Post, UIDAI, RBI, or the Government of India.</strong>
    </section>

    <h2>${total} Indexed APIs by Domain (Click Any Domain to Inspect)</h2>
    <div class="domains">${renderDomainPills()}</div>

    <h2>Connect via Streamable HTTP</h2>
    <pre tabindex="0" aria-label="MCP client configuration snippet">${SNIPPET}</pre>

    <div class="grid">
      <div class="card">
        <strong>Fair-Use Protection</strong>
        <p>30 req/min per IP on <code>POST /mcp</code>, 500 uncached <code>data.gov.in</code> OGD calls/day globally, plus 24h edge cache (PIN/IFSC) and 6h edge cache (OGD).</p>
      </div>
      <div class="card">
        <strong>Endpoints &amp; Metadata</strong>
        <p>MCP: <code>POST /mcp</code><br />Catalog UI: <a href="/catalog">/catalog</a> &middot; <a href="/catalog.json">/catalog.json</a><br />Health: <a href="/health">/health</a> &middot; <a href="/.well-known/glama.json">/.well-known/glama.json</a></p>
      </div>
    </div>

    <h2>9 Read-Only Tools</h2>
    <table>
      <thead><tr><th>Tool</th><th>Source / Mode</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>search_apis</code></td><td>Offline JSON (${total})</td><td>Filter Indian APIs by keyword, domain, tier, or auth</td></tr>
        <tr><td><code>get_api</code></td><td>Offline JSON (${total})</td><td>Fetch full metadata for an API ID (<code>IN-API-0001</code>)</td></tr>
        <tr><td><code>list_taxonomy</code></td><td>Offline JSON (${total})</td><td>Domain and sub-domain API counts</td></tr>
        <tr><td><code>digipin_encode</code></td><td>Local Math</td><td>Encode lat/lon into 10-char India Post DIGIPIN</td></tr>
        <tr><td><code>digipin_decode</code></td><td>Local Math</td><td>Decode DIGIPIN to ~4m cell centre coordinates</td></tr>
        <tr><td><code>pincode_lookup</code></td><td>India Post (24h cache)</td><td>Post offices, district, and state for a 6-digit PIN</td></tr>
        <tr><td><code>ifsc_lookup</code></td><td>Razorpay IFSC (24h cache)</td><td>Bank, branch, address, and rails for an 11-char IFSC</td></tr>
        <tr><td><code>ogd_dataset_query</code></td><td>data.gov.in (6h cache)</td><td>Query any OGD resource by UUID</td></tr>
        <tr><td><code>mandi_prices</code></td><td>data.gov.in (6h cache)</td><td>Daily Agmarknet mandi commodity prices</td></tr>
      </tbody>
    </table>

    <section class="cta" aria-label="Production Quota and Custom India DPI Integrations">
      <h2>Production Quota &amp; Custom India DPI Integrations</h2>
      <p>Hitting the 30 rpm / 500-day OGD cap, or integrating Partner-tier Indian DPIs (Aadhaar, AA, GSTN, ULIP, ABDM, ULI)? SriGenMedia Forward-Deployed Engineering builds dedicated relays, private VPC MCP servers, and DPDP-compliant pipelines.</p>
      <div class="links">
        <a class="btn" href="https://fde.srigenmedia.com/?utm_source=india-api-mcp&amp;utm_medium=ssr_landing&amp;utm_campaign=dedicated_quota" rel="noopener">Request Dedicated Quota / FDE Inquiry &rarr;</a>
        <a class="btn sec" href="https://github.com/srigenmedia/india-api-mcp/issues/new?template=api-request.yml" rel="noopener">Request a Missing Indian API</a>
      </div>
    </section>

    <div class="links">
      <a class="btn sec" href="https://srigenmedia.com/?utm_source=india-api-mcp&amp;utm_medium=ssr_landing" rel="noopener">SriGenMedia Platform</a>
      <a class="btn sec" href="https://route.srigenmedia.com/?utm_source=india-api-mcp&amp;utm_medium=ssr_landing" rel="noopener">SovereignRoute DPDP/RBI Router</a>
      <a class="btn sec" href="https://kavach.srigenmedia.com/?utm_source=india-api-mcp&amp;utm_medium=ssr_landing" rel="noopener">Kavach KYA Agent Trust</a>
      <a class="btn sec" href="https://vashishta.srigenmedia.com/developers/402?utm_source=india-api-mcp&amp;utm_medium=ssr_landing" rel="noopener">402-in-a-Box API Monetization</a>
      <a class="btn sec" href="https://craft.srigenmedia.com/?utm_source=india-api-mcp&amp;utm_medium=ssr_landing" rel="noopener">CraftCI Security Gates</a>
      <a class="btn sec" href="https://github.com/srigenmedia/india-api-mcp" rel="noopener">Source on GitHub</a>
    </div>

    <footer>Operated by SriGenMedia, Bengaluru, India &middot; Zero login required &middot; Strictly read-only public data tools.</footer>
  </main>
</body>
</html>`;
}
