import { McpToolDef } from "./types";

const RO_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true
} as const;

export const INDIA_API_MCP_TOOLS: readonly McpToolDef[] = [
  {
    name: "search_apis",
    description: "Search the catalog of 220 Indian public APIs by keyword, domain, access tier or auth method.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        domain: { type: "string" },
        access_tier: { type: "string" },
        auth_method: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      }
    },
    annotations: { title: "Search India Public APIs", ...RO_ANNOTATIONS, openWorldHint: false }
  },
  {
    name: "get_api",
    description: "Get full metadata for one API by its ID (e.g. IN-API-0001).",
    inputSchema: {
      type: "object",
      properties: { api_id: { type: "string" } },
      required: ["api_id"]
    },
    annotations: { title: "Get API Metadata", ...RO_ANNOTATIONS, openWorldHint: false }
  },
  {
    name: "list_taxonomy",
    description: "Domain -> sub-domain -> API count taxonomy.",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "List API Taxonomy", ...RO_ANNOTATIONS, openWorldHint: false }
  },
  {
    name: "pincode_lookup",
    description: "Look up post offices, district and state for an Indian 6-digit PIN code (India Post data).",
    inputSchema: {
      type: "object",
      properties: { pincode: { type: "string", pattern: "^\\d{6}$" } },
      required: ["pincode"]
    },
    annotations: { title: "India PIN Code Lookup", ...RO_ANNOTATIONS, openWorldHint: true }
  },
  {
    name: "ifsc_lookup",
    description: "Resolve an Indian bank IFSC code to bank, branch, address and supported rails.",
    inputSchema: {
      type: "object",
      properties: { ifsc: { type: "string", minLength: 11, maxLength: 11 } },
      required: ["ifsc"]
    },
    annotations: { title: "Bank IFSC Lookup", ...RO_ANNOTATIONS, openWorldHint: true }
  },
  {
    name: "digipin_encode",
    description: "Encode latitude/longitude into India Post's 10-character DIGIPIN (computed locally).",
    inputSchema: {
      type: "object",
      properties: { lat: { type: "number" }, lon: { type: "number" } },
      required: ["lat", "lon"]
    },
    annotations: { title: "Encode DIGIPIN", ...RO_ANNOTATIONS, openWorldHint: false }
  },
  {
    name: "digipin_decode",
    description: "Decode a DIGIPIN back to the centre latitude/longitude of its ~4m grid cell.",
    inputSchema: {
      type: "object",
      properties: { digipin: { type: "string" } },
      required: ["digipin"]
    },
    annotations: { title: "Decode DIGIPIN", ...RO_ANNOTATIONS, openWorldHint: false }
  },
  {
    name: "ogd_dataset_query",
    description: "Query any data.gov.in OGD resource by resource_id (cached 6h, 500 uncached calls/day cap).",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: { type: "string" },
        filters: { type: "object", additionalProperties: { type: "string" } },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 10 }
      },
      required: ["resource_id"]
    },
    annotations: { title: "Query data.gov.in OGD Resource", ...RO_ANNOTATIONS, openWorldHint: true }
  },
  {
    name: "mandi_prices",
    description: "Current daily mandi (Agmarknet) commodity prices via data.gov.in.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string" },
        commodity: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      }
    },
    annotations: { title: "Agmarknet Mandi Prices", ...RO_ANNOTATIONS, openWorldHint: true }
  }
];
