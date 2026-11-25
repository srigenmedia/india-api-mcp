import catalogFile from "../data/india_public_apis.json";
import { ApiEntry } from "./types";

export const CATALOG: readonly ApiEntry[] = catalogFile.apis as ApiEntry[];

export interface SearchApisInput {
  query?: string;
  domain?: string;
  access_tier?: string;
  auth_method?: string;
  limit?: number;
}

/** Search the offline catalog of Indian public APIs. */
export function searchApis(args: SearchApisInput = {}): ApiEntry[] {
  const q = String(args.query ?? "").trim().toLowerCase();
  const domain = String(args.domain ?? "").trim().toLowerCase();
  const accessTier = String(args.access_tier ?? "").trim().toLowerCase();
  const authMethod = String(args.auth_method ?? "").trim().toLowerCase();
  const rawLimit = typeof args.limit === "number" && Number.isFinite(args.limit) ? Math.trunc(args.limit) : 20;
  const limit = Math.max(1, Math.min(rawLimit, 100));

  const out: ApiEntry[] = [];
  for (const api of CATALOG) {
    if (q) {
      const hay = `${api.name}${api.provider}${api.capabilities}${api.sub_domain}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    if (domain && !api.domain.toLowerCase().includes(domain)) continue;
    if (accessTier && accessTier !== api.access_tier.toLowerCase()) continue;
    if (authMethod && authMethod !== api.auth_method.toLowerCase()) continue;
    out.push(api);
    if (out.length >= limit) break;
  }
  return out;
}

/** Look up full metadata for one API by ID (e.g. IN-API-0001). */
export function getApi(apiId: string): ApiEntry | { error: string } {
  const id = String(apiId ?? "").trim();
  const found = CATALOG.find((api) => api.id === id);
  return found ?? { error: `${id} not found` };
}

/** Return domain -> sub_domain -> API count taxonomy. */
export function listTaxonomy(): Record<string, Record<string, number>> {
  const taxonomy: Record<string, Record<string, number>> = {};
  for (const api of CATALOG) {
    if (!taxonomy[api.domain]) {
      taxonomy[api.domain] = {};
    }
    taxonomy[api.domain][api.sub_domain] = (taxonomy[api.domain][api.sub_domain] ?? 0) + 1;
  }
  return taxonomy;
}
