export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ENVIRONMENT?: string;
  OGD_KEY?: string;
  OGD_RELAY_URL?: string;
  OGD_RELAY_SECRET?: string;
  OGD_DAILY_LIMIT?: string;
  IP_RPM_LIMIT?: string;
  PIN_IFSC_CACHE_TTL_SEC?: string;
  OGD_CACHE_TTL_SEC?: string;
  IP_RATE_LIMITER?: RateLimitBinding;
  QUOTA_DB?: D1Database;
}

export interface ApiEntry {
  id: string;
  name: string;
  provider: string;
  domain: string;
  sub_domain: string;
  access_tier: string;
  auth_method: string;
  doc_url: string;
  capabilities: string;
}

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
}

export interface QuotaCheckResult {
  allowed: boolean;
  status: number;
  code: string;
  message: string;
  retryAfterSec: number;
}

export type LiveToolResponse =
  | { ok: true; data: unknown; isError?: boolean }
  | { ok: false; httpStatus: number; rpcCode: number; message: string; retryAfterSec: number };

export interface RuntimeDeps {
  fetchFn?: typeof fetch;
  cache?: Cache | null;
  now?: () => Date;
}
