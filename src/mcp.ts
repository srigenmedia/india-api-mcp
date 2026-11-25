import { CATALOG, getApi, listTaxonomy, searchApis } from "./catalog";
import { digipinDecode, digipinEncode } from "./digipin";
import { ifscLookup, mandiPrices, ogdDatasetQuery, pincodeLookup } from "./liveTools";
import { checkIpRateLimit } from "./quota";
import { INDIA_API_MCP_TOOLS } from "./toolsMeta";
import { Env, JsonRpcRequest, LiveToolResponse, RuntimeDeps } from "./types";

const MAX_BODY_BYTES = 65536;

function rpcOk(id: string | number | null | undefined, result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function rpcErr(
  id: string | number | null | undefined,
  code: number,
  message: string,
  status: number,
  retryAfterSec?: number
): Response {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (retryAfterSec && retryAfterSec > 0) headers["retry-after"] = String(retryAfterSec);
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }), {
    status,
    headers
  });
}

function toToolResult(res: LiveToolResponse, id: string | number | null | undefined): Response {
  if (!res.ok) {
    return rpcErr(id, res.rpcCode, res.message, res.httpStatus, res.retryAfterSec);
  }
  const errObj = res.data && typeof res.data === "object" && "error" in (res.data as Record<string, unknown>);
  return rpcOk(id, {
    content: [{ type: "text", text: JSON.stringify(res.data) }],
    structuredContent: res.data,
    isError: Boolean(res.isError || errObj)
  });
}

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps
): Promise<LiveToolResponse | null> {
  switch (name) {
    case "search_apis":
      return { ok: true, data: searchApis(args) };
    case "get_api":
      return { ok: true, data: getApi(String(args.api_id ?? "")) };
    case "list_taxonomy":
      return { ok: true, data: listTaxonomy() };
    case "digipin_encode":
      return { ok: true, data: digipinEncode(Number(args.lat), Number(args.lon)) };
    case "digipin_decode":
      return { ok: true, data: digipinDecode(String(args.digipin ?? "")) };
    case "pincode_lookup":
      return pincodeLookup(String(args.pincode ?? ""), env, ctx, deps);
    case "ifsc_lookup":
      return ifscLookup(String(args.ifsc ?? ""), env, ctx, deps);
    case "ogd_dataset_query":
      return ogdDatasetQuery(
        {
          resource_id: String(args.resource_id ?? ""),
          filters: (args.filters as Record<string, string> | undefined) ?? undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined
        },
        env,
        ctx,
        deps
      );
    case "mandi_prices":
      return mandiPrices(
        {
          state: args.state ? String(args.state) : undefined,
          commodity: args.commodity ? String(args.commodity) : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined
        },
        env,
        ctx,
        deps
      );
    default:
      return null;
  }
}

/** Handle Streamable HTTP JSON-RPC 2.0 MCP requests on POST /mcp. */
export async function handleMcpRequest(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
  deps?: RuntimeDeps,
  onTelemetry?: (meta: { rpc_method?: string; tool?: string }) => void
): Promise<Response> {
  const declaredLen = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BODY_BYTES) {
    return rpcErr(null, -32600, "Payload too large", 413);
  }

  const clientIp = request.headers.get("cf-connecting-ip") ?? "local";
  const ipQuota = await checkIpRateLimit(env, clientIp);
  if (!ipQuota.allowed) {
    const code = ipQuota.status === 429 ? -32029 : -32002;
    return rpcErr(null, code, ipQuota.message, ipQuota.status, ipQuota.retryAfterSec);
  }

  const rawText = await request.text();
  if (new TextEncoder().encode(rawText).byteLength > MAX_BODY_BYTES) {
    return rpcErr(null, -32600, "Payload too large", 413);
  }

  let body: JsonRpcRequest;
  try {
    body = JSON.parse(rawText) as JsonRpcRequest;
  } catch {
    return rpcErr(null, -32700, "Parse error", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return rpcErr(null, -32600, "Invalid Request", 400);
  }
  const rpcMethod = typeof body.method === "string" ? body.method : undefined;
  const calledTool = rpcMethod === "tools/call" ? String(body.params?.name ?? "") : undefined;
  if (rpcMethod) {
    onTelemetry?.({ rpc_method: rpcMethod, ...(calledTool ? { tool: calledTool } : {}) });
  }

  if (body.method === "initialize") {
    return rpcOk(body.id, {
      protocolVersion: "2025-11-25",
      serverInfo: { name: "io.github.srigenmedia/india-api-mcp", version: "0.2.0" },
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false }
      }
    });
  }
  if (body.method === "notifications/initialized") {
    return new Response(null, { status: 204 });
  }
  if (body.method === "ping") {
    return rpcOk(body.id, {});
  }
  if (body.method === "resources/list") {
    return rpcOk(body.id, {
      resources: [
        {
          uri: "india-apis://taxonomy",
          name: "India Public APIs Taxonomy",
          description: `Domain and sub-domain counts across all ${CATALOG.length} Indian public APIs.`,
          mimeType: "application/json"
        },
        {
          uri: "india-apis://catalog",
          name: "India Public APIs Full Catalog",
          description: `Complete offline JSON catalog of ${CATALOG.length} Indian public APIs (${CATALOG[0]?.id ?? "IN-API-0001"}..${CATALOG[CATALOG.length - 1]?.id ?? "IN-API-0246"}).`,
          mimeType: "application/json"
        }
      ]
    });
  }
  if (body.method === "resources/read") {
    const uri = String(body.params?.uri ?? "");
    if (uri === "india-apis://taxonomy") {
      return rpcOk(body.id, {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ count: CATALOG.length, domains: listTaxonomy() }) }]
      });
    }
    if (uri === "india-apis://catalog") {
      return rpcOk(body.id, {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ count: CATALOG.length, apis: CATALOG }) }]
      });
    }
    return rpcErr(body.id, -32602, `Unknown resource URI: ${uri}`, 400);
  }
  if (body.method === "tools/list") {
    return rpcOk(body.id, { tools: INDIA_API_MCP_TOOLS });
  }
  if (body.method !== "tools/call") {
    return rpcErr(body.id, -32601, `Method not found: ${String(body.method ?? "")}`, 404);
  }

  const toolName = String(body.params?.name ?? "");
  const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
  const result = await dispatchTool(toolName, args, env, ctx, deps);
  if (!result) {
    return rpcErr(body.id, -32602, `Unknown tool: ${toolName}`, 400);
  }
  return toToolResult(result, body.id);
}
