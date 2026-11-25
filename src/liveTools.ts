import { claimOgdDailyQuota, parsePositiveInt } from "./quota";
import { buildRelayRequest } from "./relay";
import { Env, LiveToolResponse, RuntimeDeps } from "./types";

export const MAX_CHARS = 20000;
export const MAX_UPSTREAM_BYTES = 200000;
export const UPSTREAM_TIMEOUT_MS = 10000;

const PIN_RE = /^\d{6}$/;
const IFSC_RE = /^[A-Z0-9]{11}$/;
const RESOURCE_ID_RE = /^[a-fA-F0-9-]{8,64}$/;
const FILTER_KEY_RE = /^[a-zA-Z0-9_.-]{1,64}$/;
const MANDI_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

function resolveCache(deps?: RuntimeDeps): Cache | null {
  if (deps && "cache" in deps) return deps.cache ?? null;
  const g = globalThis as unknown as { caches?: { default?: Cache } };
  return g.caches?.default ?? null;
}

function trimPayload(data: unknown): unknown {
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_CHARS) {
    return { truncated: true, preview: serialized.slice(0, MAX_CHARS) };
  }
  return typeof data === "object" && data !== null && !Array.isArray(data) ? data : { result: data };
}

async function readBodyCapped(resp: Response, maxBytes: number): Promise<string> {
  if (!resp.body) return (await resp.text()).slice(0, maxBytes);
  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const take = Math.min(value.byteLength, maxBytes - total);
    chunks.push(take < value.byteLength ? value.subarray(0, take) : value);
    total += take;
  }
  if (total >= maxBytes) await reader.cancel();
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}

async function cachedUpstreamFetch(
  opts: {
    cacheKind: string;
    cacheKey: string;
    upstreamUrl: string;
    ttlSec: number;
    requiresOgdQuota?: boolean;
    errorHostLabel?: string;
    buildFetchRequest?: () => Promise<{ url: string; init: RequestInit }>;
  },
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps
): Promise<LiveToolResponse> {
  const cache = resolveCache(deps);
  const cacheReq = new Request(`https://india-api.srigenmedia.com/__cache/${opts.cacheKind}/${encodeURIComponent(opts.cacheKey)}`);
  if (cache) {
    const hit = await cache.match(cacheReq);
    if (hit) return { ok: true, data: await hit.json() };
  }
  if (opts.requiresOgdQuota) {
    const quota = await claimOgdDailyQuota(env, deps?.now ? deps.now() : new Date());
    if (!quota.allowed) {
      return { ok: false, httpStatus: quota.status, rpcCode: quota.status === 429 ? -32029 : -32002, message: quota.message, retryAfterSec: quota.retryAfterSec };
    }
  }
  const fetchFn = deps?.fetchFn ?? fetch;
  const host = opts.errorHostLabel ?? new URL(opts.upstreamUrl).host;
  let resp: Response;
  try {
    const reqSpec = opts.buildFetchRequest
      ? await opts.buildFetchRequest()
      : { url: opts.upstreamUrl, init: { headers: { Accept: "application/json", "User-Agent": "IndiaPublicAPIsMCP/0.1 (+https://india-api.srigenmedia.com)" } } };
    resp = await fetchFn(reqSpec.url, { ...reqSpec.init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch {
    return { ok: true, data: { error: `Upstream ${host} request failed` }, isError: true };
  }
  if (!resp.ok) {
    await resp.body?.cancel();
    return { ok: true, data: { error: `Upstream ${host} returned HTTP ${resp.status}` }, isError: true };
  }
  const text = await readBodyCapped(resp, MAX_UPSTREAM_BYTES);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, MAX_CHARS); }
  const trimmed = trimPayload(parsed);
  if (cache) {
    const cacheResp = new Response(JSON.stringify(trimmed), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${opts.ttlSec}` }
    });
    if (ctx) ctx.waitUntil(cache.put(cacheReq, cacheResp));
    else await cache.put(cacheReq, cacheResp);
  }
  return { ok: true, data: trimmed };
}

/** Look up Indian 6-digit PIN code details via India Post API (24h edge cached). */
export async function pincodeLookup(
  pincode: string,
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps
): Promise<LiveToolResponse> {
  const clean = String(pincode ?? "").trim();
  if (!PIN_RE.test(clean)) {
    return { ok: true, data: { error: "PIN code must be 6 digits" }, isError: true };
  }
  const ttlSec = parsePositiveInt(env.PIN_IFSC_CACHE_TTL_SEC, 86400);
  return cachedUpstreamFetch(
    {
      cacheKind: "pincode",
      cacheKey: clean,
      upstreamUrl: `https://api.postalpincode.in/pincode/${clean}`,
      ttlSec
    },
    env,
    ctx,
    deps
  );
}

/** Look up Indian bank IFSC metadata via Razorpay IFSC API (24h edge cached). */
export async function ifscLookup(
  ifsc: string,
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps
): Promise<LiveToolResponse> {
  const clean = String(ifsc ?? "").trim().toUpperCase();
  if (!IFSC_RE.test(clean)) {
    return { ok: true, data: { error: "IFSC must be 11 alphanumeric characters" }, isError: true };
  }
  const ttlSec = parsePositiveInt(env.PIN_IFSC_CACHE_TTL_SEC, 86400);
  return cachedUpstreamFetch(
    {
      cacheKind: "ifsc",
      cacheKey: clean,
      upstreamUrl: `https://ifsc.razorpay.com/${clean}`,
      ttlSec
    },
    env,
    ctx,
    deps
  );
}

/** Query any data.gov.in OGD resource by resource_id (6h edge cached + 500/day D1 quota). */
export async function ogdDatasetQuery(
  args: { resource_id: string; filters?: Record<string, string>; limit?: number },
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps
): Promise<LiveToolResponse> {
  const resourceId = String(args.resource_id ?? "").trim();
  if (!RESOURCE_ID_RE.test(resourceId)) {
    return { ok: true, data: { error: "Invalid OGD resource_id format" }, isError: true };
  }
  const relayUrl = String(env.OGD_RELAY_URL ?? "").trim();
  const relaySecret = String(env.OGD_RELAY_SECRET ?? "").trim();
  const ogdKey = String(env.OGD_KEY ?? "").trim();
  const useRelay = Boolean(relayUrl && relaySecret);
  if (!useRelay && !ogdKey) {
    return { ok: true, data: { error: "OGD_KEY not configured on edge worker." }, isError: true };
  }

  const rawLimit = typeof args.limit === "number" && Number.isFinite(args.limit) ? Math.trunc(args.limit) : 10;
  const limit = Math.max(1, Math.min(rawLimit, 100));
  const sortedEntries: [string, string][] = [];
  if (args.filters && typeof args.filters === "object" && !Array.isArray(args.filters)) {
    for (const k of Object.keys(args.filters).sort()) {
      if (!FILTER_KEY_RE.test(k)) {
        return { ok: true, data: { error: "Invalid filter key" }, isError: true };
      }
      const v = String(args.filters[k] ?? "").trim();
      if (v) sortedEntries.push([k, v.slice(0, 128)]);
    }
  }

  const cacheKey = JSON.stringify({ resourceId, limit, filters: sortedEntries });
  const ttlSec = parsePositiveInt(env.OGD_CACHE_TTL_SEC, 21600);
  if (useRelay) {
    return cachedUpstreamFetch(
      {
        cacheKind: "ogd",
        cacheKey,
        upstreamUrl: "https://api.data.gov.in",
        errorHostLabel: "api.data.gov.in-relay",
        ttlSec,
        requiresOgdQuota: true,
        buildFetchRequest: () =>
          buildRelayRequest(
            relayUrl,
            relaySecret,
            { resource_id: resourceId, filters: sortedEntries, limit },
            deps?.now ? deps.now() : new Date()
          )
      },
      env,
      ctx,
      deps
    );
  }

  const params = new URLSearchParams({ "api-key": ogdKey, format: "json", limit: String(limit) });
  for (const [k, v] of sortedEntries) {
    params.set(`filters[${k}]`, v);
  }
  return cachedUpstreamFetch(
    {
      cacheKind: "ogd",
      cacheKey,
      upstreamUrl: `https://api.data.gov.in/resource/${resourceId}?${params.toString()}`,
      ttlSec,
      requiresOgdQuota: true
    },
    env,
    ctx,
    deps
  );
}

/** Query current daily mandi (Agmarknet) commodity prices via data.gov.in. */
export async function mandiPrices(
  args: { state?: string; commodity?: string; limit?: number },
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps
): Promise<LiveToolResponse> {
  const filters: Record<string, string> = {};
  if (args.state && String(args.state).trim()) filters["state.keyword"] = String(args.state).trim();
  if (args.commodity && String(args.commodity).trim()) filters.commodity = String(args.commodity).trim();
  return ogdDatasetQuery(
    { resource_id: MANDI_RESOURCE_ID, filters, limit: args.limit ?? 20 },
    env,
    ctx,
    deps
  );
}
