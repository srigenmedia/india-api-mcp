import { CATALOG, listTaxonomy } from "./catalog";
import { renderCatalogHtml } from "./catalogPage";
import { renderLandingHtml } from "./landing";
import { handleMcpRequest } from "./mcp";
import { fnv1aHash, parsePositiveInt, readOgdDailyCount } from "./quota";
import { Env, RuntimeDeps } from "./types";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept, Mcp-Session-Id"
};

function withHeaders(resp: Response, extra?: Record<string, string>): Response {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  }
  return new Response(resp.body, { status: resp.status, headers });
}

function hasRawTraversal(rawUrl: string): boolean {
  const idx = rawUrl.indexOf("://");
  const afterScheme = idx >= 0 ? rawUrl.slice(idx + 3) : rawUrl;
  const slashIdx = afterScheme.indexOf("/");
  const pathAndQuery = slashIdx >= 0 ? afterScheme.slice(slashIdx) : "/";
  const lower = pathAndQuery.toLowerCase();
  return lower.includes("%2e%2e") || lower.includes("%2e/") || lower.includes("/..") || lower.includes("\\");
}

/** Create Worker fetch handler with optional test dependencies. */
export function createHandler(deps?: RuntimeDeps) {
  return {
    async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
      const start = Date.now();
      const ipHash = fnv1aHash(request.headers.get("cf-connecting-ip") ?? "local");
      let status = 500;
      let path = "/";
      let rpcMethod: string | undefined;
      let tool: string | undefined;
      try {
        if (hasRawTraversal(request.url)) {
          status = 400;
          return withHeaders(
            new Response(JSON.stringify({ error: "Invalid path" }), {
              status: 400,
              headers: { "content-type": "application/json" }
            })
          );
        }

        const url = new URL(request.url);
        path = url.pathname;

        if (request.method === "OPTIONS") {
          status = 204;
          return withHeaders(new Response(null, { status: 204 }));
        }

        if (request.method === "GET" && path === "/") {
          status = 200;
          return withHeaders(
            new Response(renderLandingHtml(), {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" }
            })
          );
        }

        if (request.method === "GET" && path === "/catalog") {
          status = 200;
          return withHeaders(
            new Response(renderCatalogHtml(), {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" }
            })
          );
        }

        if (request.method === "GET" && path === "/catalog.json") {
          status = 200;
          return withHeaders(
            new Response(
              JSON.stringify({
                count: CATALOG.length,
                attribution: "Curated by SriGenMedia (Bengaluru, India) from publicly documented APIs & GODL-India (data.gov.in).",
                apis: CATALOG
              }),
              { status: 200, headers: { "content-type": "application/json", "cache-control": "public, max-age=86400" } }
            )
          );
        }

        if (request.method === "GET" && path === "/taxonomy.json") {
          status = 200;
          return withHeaders(
            new Response(
              JSON.stringify({ count: CATALOG.length, domains: listTaxonomy() }),
              { status: 200, headers: { "content-type": "application/json", "cache-control": "public, max-age=86400" } }
            )
          );
        }

        if (request.method === "GET" && path === "/health") {
          const now = deps?.now ? deps.now() : new Date();
          const ogdDailyUsed = await readOgdDailyCount(env, now);
          status = 200;
          return withHeaders(
            new Response(
              JSON.stringify({
                status: "ok",
                service: "india-api-mcp-edge",
                environment: env.ENVIRONMENT ?? "production",
                gcp_billing: 0,
                catalog_count: CATALOG.length,
                tools: 9,
                ogd_configured: Boolean(
                  (env.OGD_RELAY_URL && env.OGD_RELAY_URL.trim() && env.OGD_RELAY_SECRET && env.OGD_RELAY_SECRET.trim()) ||
                    (env.OGD_KEY && env.OGD_KEY.trim().length > 0)
                ),
                ogd_mode:
                  env.OGD_RELAY_URL && env.OGD_RELAY_URL.trim() && env.OGD_RELAY_SECRET && env.OGD_RELAY_SECRET.trim()
                    ? "aws-ap-south-1-relay"
                    : "direct",
                ogd_daily_used: ogdDailyUsed,
                limits: {
                  ip_rpm: parsePositiveInt(env.IP_RPM_LIMIT, 30),
                  ogd_daily: parsePositiveInt(env.OGD_DAILY_LIMIT, 500),
                  pin_ifsc_cache_ttl_sec: parsePositiveInt(env.PIN_IFSC_CACHE_TTL_SEC, 86400),
                  ogd_cache_ttl_sec: parsePositiveInt(env.OGD_CACHE_TTL_SEC, 21600)
                }
              }),
              { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
            )
          );
        }

        if (request.method === "GET" && path === "/.well-known/glama.json") {
          status = 200;
          return withHeaders(
            new Response(
              JSON.stringify({
                $schema: "https://glama.ai/mcp/schemas/server.json",
                maintainers: ["srigenmedia"]
              }),
              { status: 200, headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } }
            )
          );
        }

        if (path === "/mcp") {
          if (request.method !== "POST") {
            status = 405;
            return withHeaders(
              new Response(JSON.stringify({ error: "Method Not Allowed: use POST /mcp" }), {
                status: 405,
                headers: { "content-type": "application/json", allow: "POST, OPTIONS" }
              })
            );
          }
          const resp = await handleMcpRequest(request, env, ctx, deps, (meta) => {
            if (meta.rpc_method) rpcMethod = meta.rpc_method;
            if (meta.tool) tool = meta.tool;
          });
          status = resp.status;
          return withHeaders(resp);
        }

        status = 404;
        return withHeaders(
          new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: { "content-type": "application/json" }
          })
        );
      } catch {
        status = 500;
        return withHeaders(
          new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "content-type": "application/json" }
          })
        );
      } finally {
        console.log(
          JSON.stringify({
            svc: "india-api-mcp",
            method: request.method,
            path,
            status,
            ip_hash: ipHash,
            ms: Date.now() - start,
            ...(rpcMethod ? { rpc_method: rpcMethod } : {}),
            ...(tool ? { tool } : {})
          })
        );
      }
    }
  };
}

export default createHandler();
