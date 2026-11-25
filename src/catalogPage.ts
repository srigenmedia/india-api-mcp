import { CATALOG } from "./catalog";

function esc(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(raw: string): string {
  return /^https?:\/\//i.test(raw) ? esc(raw) : "#";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

/** Render SSR searchable catalog page listing all Indian public APIs. */
export function renderCatalogHtml(): string {
  const domains = uniqueSorted(CATALOG.map((a) => a.domain));
  const tiers = uniqueSorted(CATALOG.map((a) => a.access_tier));
  const auths = uniqueSorted(CATALOG.map((a) => a.auth_method));
  const domainOpts = domains.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
  const tierOpts = tiers.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  const authOpts = auths.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");

  const rows = CATALOG.map((a) => {
    const searchBlob = esc(`${a.id} ${a.name} ${a.provider} ${a.domain} ${a.sub_domain} ${a.capabilities}`.toLowerCase());
    return `<tr data-domain="${esc(a.domain)}" data-tier="${esc(a.access_tier)}" data-auth="${esc(a.auth_method)}" data-q="${searchBlob}">
      <td><code>${esc(a.id)}</code></td>
      <td><strong><a href="${safeHref(a.doc_url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a></strong><br /><span class="muted">${esc(a.provider)}</span></td>
      <td>${esc(a.domain)}<br /><span class="muted">${esc(a.sub_domain)}</span></td>
      <td><span class="pill">${esc(a.access_tier)}</span><br /><span class="muted">${esc(a.auth_method)}</span></td>
      <td>${esc(a.capabilities)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${CATALOG.length} Indian Public APIs Catalog — SriGenMedia MCP</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0f172a; color: #f8fafc; line-height: 1.5; }
    main { max-width: 1180px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
    svg { max-width: 100%; display: inline-block; vertical-align: middle; }
    svg:not([width]) { width: 1.25rem; height: 1.25rem; }
    .top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .brand { display: flex; align-items: center; gap: 0.75rem; }
    h1 { font-size: 1.5rem; margin: 0; }
    a { color: #7dd3fc; }
    .nav { display: flex; flex-wrap: wrap; gap: 0.65rem; }
    .btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 0.9rem; border-radius: 0.5rem; background: #1e293b; border: 1px solid #475569; color: #f8fafc; text-decoration: none; font-size: 0.9rem; font-weight: 600; }
    .btn.pri { background: #065f46; border-color: #065f46; }
    .controls { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 0.75rem; margin: 1rem 0; }
    @media (max-width: 820px) { .controls { grid-template-columns: 1fr; } }
    input, select { width: 100%; min-height: 44px; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-size: 0.95rem; }
    .count { font-variant-numeric: tabular-nums; color: #cbd5e1; margin: 0.5rem 0 1rem; font-weight: 600; }
    .wrap { overflow-x: auto; border: 1px solid #334155; border-radius: 0.6rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid #334155; vertical-align: top; }
    th { background: #1e293b; color: #e2e8f0; position: sticky; top: 0; }
    .muted { color: #94a3b8; font-size: 0.82rem; }
    .pill { display: inline-block; background: #1e293b; border: 1px solid #475569; padding: 0.1rem 0.45rem; border-radius: 999px; font-size: 0.78rem; }
    code { color: #fde68a; }
    .notice { background: #1e293b; border-left: 4px solid #f59e0b; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.9rem; color: #e2e8f0; }
    .cta { margin-top: 1.5rem; background: #1e293b; border: 1px solid #10b981; border-radius: 0.6rem; padding: 1rem 1.15rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.85rem; }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div class="brand">
        <svg width="40" height="40" viewBox="0 0 128 128" role="img" aria-label="India Public APIs MCP logo">
          <rect width="128" height="128" rx="24" fill="#1e293b" stroke="#38bdf8" stroke-width="4" />
          <path d="M24 42h80v14H24z" fill="#f97316" />
          <path d="M24 57h80v14H24z" fill="#f8fafc" />
          <path d="M24 72h80v14H24z" fill="#10b981" />
          <circle cx="64" cy="64" r="6" fill="#1d4ed8" />
        </svg>
        <div>
          <h1>${CATALOG.length} Indian Public APIs Catalog</h1>
          <div class="muted">Served directly from the MCP bundle &middot; <a href="/catalog.json">catalog.json</a> &middot; <a href="/taxonomy.json">taxonomy.json</a></div>
        </div>
      </div>
      <div class="nav">
        <a class="btn" href="/">Back to MCP Overview</a>
        <a class="btn pri" href="/catalog.json">Download JSON</a>
        <a class="btn pri" href="https://srigenmedia.com/contact?utm_source=india-api-mcp&amp;utm_medium=catalog_nav&amp;utm_campaign=dedicated_quota" rel="noopener">Dedicated Quota / FDE</a>
      </div>
    </div>

    <div class="notice"><strong>Non-Affiliation:</strong> Independent catalog by SriGenMedia (Bengaluru, India) indexing publicly documented Indian APIs &amp; Open Government Data (<a href="https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf" rel="noopener">GODL-India</a>). Not affiliated with NIC, India Post, UIDAI, RBI, or the Government of India.</div>

    <div class="controls">
      <input id="q" type="search" placeholder="Search API name, provider, capability, ID..." aria-label="Search APIs" />
      <select id="dom" aria-label="Filter by domain"><option value="">All ${domains.length} Domains</option>${domainOpts}</select>
      <select id="tier" aria-label="Filter by access tier"><option value="">All Access Tiers</option>${tierOpts}</select>
      <select id="auth" aria-label="Filter by auth method"><option value="">All Auth Methods</option>${authOpts}</select>
    </div>

    <div class="count" id="count">Showing ${CATALOG.length} of ${CATALOG.length} APIs</div>

    <div class="wrap" tabindex="0" aria-label="Indian Public APIs table">
      <table>
        <thead><tr><th>ID</th><th>API &amp; Provider</th><th>Domain</th><th>Access &amp; Auth</th><th>Capabilities</th></tr></thead>
        <tbody id="rows">${rows}</tbody>
      </table>
    </div>
    <div class="cta">
      <div><strong>Need higher rate limits, private OGD relays, or custom integration for Sandbox/Partner Indian APIs?</strong></div>
      <div class="nav">
        <a class="btn pri" href="https://srigenmedia.com/contact?utm_source=india-api-mcp&amp;utm_medium=catalog_footer&amp;utm_campaign=fde_integration" rel="noopener">Talk to SriGenMedia FDE &rarr;</a>
        <a class="btn" href="https://github.com/srigenmedia/india-api-mcp/issues/new?template=api-request.yml" rel="noopener">Request an API</a>
      </div>
    </div>
  </main>
  <script>
    (function () {
      var qEl = document.getElementById("q");
      var dEl = document.getElementById("dom");
      var tEl = document.getElementById("tier");
      var aEl = document.getElementById("auth");
      var cEl = document.getElementById("count");
      var trs = Array.prototype.slice.call(document.querySelectorAll("#rows tr"));
      var params = new URLSearchParams(window.location.search);
      if (params.get("domain")) dEl.value = params.get("domain");
      if (params.get("q")) qEl.value = params.get("q");
      function apply() {
        var q = qEl.value.trim().toLowerCase();
        var d = dEl.value, t = tEl.value, a = aEl.value, shown = 0;
        for (var i = 0; i < trs.length; i++) {
          var r = trs[i];
          var ok = (!q || r.getAttribute("data-q").indexOf(q) !== -1)
            && (!d || r.getAttribute("data-domain") === d)
            && (!t || r.getAttribute("data-tier") === t)
            && (!a || r.getAttribute("data-auth") === a);
          r.style.display = ok ? "" : "none";
          if (ok) shown++;
        }
        cEl.textContent = "Showing " + shown + " of " + trs.length + " APIs";
      }
      qEl.addEventListener("input", apply);
      dEl.addEventListener("change", apply);
      tEl.addEventListener("change", apply);
      aEl.addEventListener("change", apply);
      apply();
    })();
  </script>
</body>
</html>`;
}
