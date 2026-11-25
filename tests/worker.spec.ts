import { describe, expect, it } from "vitest";
import { CATALOG, getApi, listTaxonomy, searchApis } from "../src/catalog";
import { digipinDecode, digipinEncode } from "../src/digipin";
import { createHandler } from "../src/index";
import { Env } from "../src/types";

function createMockD1(initialCount = 0) {
  let count = initialCount;
  return {
    claims: 0,
    db: {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async run() {
                if (sql.includes("INSERT INTO ogd_daily_usage")) {
                  const limit = Number(args[2] ?? 500);
                  if (count >= limit) return { success: true, meta: { changes: 0 } };
                  count += 1;
                  return { success: true, meta: { changes: 1 } };
                }
                return { success: true, meta: { changes: 0 } };
              },
              async first<T>() {
                return { count } as T;
              }
            };
          }
        };
      }
    } as unknown as D1Database
  };
}

function createMemoryCache(): Cache {
  const store = new Map<string, Response>();
  return {
    async match(req: RequestInfo | URL) {
      const key = typeof req === "string" ? req : req instanceof URL ? req.toString() : req.url;
      const hit = store.get(key);
      return hit ? hit.clone() : undefined;
    },
    async put(req: RequestInfo | URL, res: Response) {
      const key = typeof req === "string" ? req : req instanceof URL ? req.toString() : req.url;
      store.set(key, res.clone());
    },
    async delete() {
      return false;
    }
  } as unknown as Cache;
}

describe("india-api-mcp catalog, digipin, and MCP protocol", () => {
  it("loads 220 APIs and matches Python catalog search/get/taxonomy", () => {
    expect(CATALOG.length).toBe(220);
    expect(searchApis({ query: "aadhaar" }).length).toBeGreaterThan(0);
    const first = getApi("IN-API-0001");
    expect("id" in first && first.id).toBe("IN-API-0001");
    expect(Object.keys(listTaxonomy()).length).toBeGreaterThanOrEqual(8);
  });

  it("matches Dak Bhawan DIGIPIN reference vector 39J-49L-L8T4", () => {
    const enc = digipinEncode(28.622788, 77.213033);
    expect(enc).toEqual({ digipin: "39J-49L-L8T4" });
    if ("digipin" in enc) {
      const dec = digipinDecode(enc.digipin);
      expect("lat" in dec && Math.abs(dec.lat - 28.622788)).toBeLessThan(1e-4);
      expect("lon" in dec && Math.abs(dec.lon - 77.213033)).toBeLessThan(1e-4);
    }
    expect("error" in digipinEncode(0, 0)).toBe(true);
    expect("error" in digipinDecode("INVALID")).toBe(true);
  });

  it("serves SSR landing with GODL-India disclaimer, /health, and /.well-known/glama.json", async () => {
    const mockD1 = createMockD1(3);
    const handler = createHandler({ cache: createMemoryCache() });
    const env: Env = { ENVIRONMENT: "test", OGD_KEY: "demo-secret", QUOTA_DB: mockD1.db };

    const home = await handler.fetch(new Request("https://india-api.srigenmedia.com/"), env);
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain("GODL-India");
    expect(html).toContain("Not affiliated with");
    expect(html).toContain('href="/catalog"');
    expect(html).toContain("BFSI");
    expect(html.toLowerCase()).not.toContain("razorpay.com/checkout");

    const catalogPage = await handler.fetch(new Request("https://india-api.srigenmedia.com/catalog"), env);
    expect(catalogPage.status).toBe(200);
    const catalogHtml = await catalogPage.text();
    expect(catalogHtml).toContain("IN-API-0001");
    expect(catalogHtml).toContain("IN-API-0220");

    const catalogJsonRes = await handler.fetch(new Request("https://india-api.srigenmedia.com/catalog.json"), env);
    expect(catalogJsonRes.status).toBe(200);
    const catalogJson = (await catalogJsonRes.json()) as { count: number; apis: unknown[] };
    expect(catalogJson.count).toBe(220);
    expect(catalogJson.apis).toHaveLength(220);

    const taxJsonRes = await handler.fetch(new Request("https://india-api.srigenmedia.com/taxonomy.json"), env);
    expect(taxJsonRes.status).toBe(200);
    const taxJson = (await taxJsonRes.json()) as { count: number; domains: Record<string, Record<string, number>> };
    expect(taxJson.count).toBe(220);
    const sum = Object.values(taxJson.domains).reduce(
      (a, subs) => a + Object.values(subs).reduce((b, n) => b + n, 0),
      0
    );
    expect(sum).toBe(220);

    const health = await handler.fetch(new Request("https://india-api.srigenmedia.com/health"), env);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      status: "ok",
      gcp_billing: 0,
      catalog_count: 220,
      tools: 9,
      ogd_configured: true,
      ogd_daily_used: 3
    });

    const glama = await handler.fetch(new Request("https://india-api.srigenmedia.com/.well-known/glama.json"), env);
    expect(glama.status).toBe(200);
    expect(await glama.json()).toEqual({
      $schema: "https://glama.ai/mcp/schemas/server.json",
      maintainers: ["srigenmedia"]
    });
  });

  it("handles initialize, 204 notifications/initialized, and 9 readOnlyHint tools", async () => {
    const handler = createHandler({ cache: createMemoryCache() });
    const env: Env = {};

    const init = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })
      }),
      env
    );
    expect(init.status).toBe(200);

    const notif = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
      }),
      env
    );
    expect(notif.status).toBe(204);

    const list = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
      }),
      env
    );
    expect(list.status).toBe(200);
    const body = (await list.json()) as { result: { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> } };
    expect(body.result.tools).toHaveLength(9);
    expect(body.result.tools.every((t) => t.annotations.readOnlyHint === true)).toBe(true);

    const resList = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "resources/list" })
      }),
      env
    );
    expect(resList.status).toBe(200);
    const resBody = (await resList.json()) as { result: { resources: Array<{ uri: string }> } };
    expect(resBody.result.resources.map((r) => r.uri)).toEqual(["india-apis://taxonomy", "india-apis://catalog"]);

    const resRead = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "resources/read",
          params: { uri: "india-apis://taxonomy" }
        })
      }),
      env
    );
    expect(resRead.status).toBe(200);
    const readJson = (await resRead.json()) as { result: { contents: Array<{ text: string }> } };
    expect(JSON.parse(readJson.result.contents[0].text)).toMatchObject({ count: 220 });
  });

  it("caches repeated PIN, IFSC, and OGD calls without duplicate upstream fetch or D1 quota", async () => {
    let fetchCalls = 0;
    let d1Claims = 0;
    const cache = createMemoryCache();
    const baseD1 = createMockD1(0);
    const countingDb = {
      prepare(sql: string) {
        const inner = baseD1.db.prepare(sql);
        return {
          bind(...args: unknown[]) {
            const bound = inner.bind(...args);
            return {
              async run() {
                d1Claims += 1;
                return bound.run();
              },
              first: bound.first
            };
          }
        };
      }
    } as unknown as D1Database;

    const handler = createHandler({
      cache,
      fetchFn: async (input) => {
        fetchCalls += 1;
        const url = String(input);
        if (url.includes("postalpincode.in")) return new Response(JSON.stringify([{ Status: "Success" }]));
        if (url.includes("ifsc.razorpay.com")) return new Response(JSON.stringify({ BANK: "SBI" }));
        return new Response(JSON.stringify({ records: [{ commodity: "Rice" }] }));
      }
    });
    const env: Env = { OGD_KEY: "test-ogd-key-123", QUOTA_DB: countingDb };

    const call = (name: string, args: Record<string, unknown>) =>
      handler.fetch(
        new Request("https://india-api.srigenmedia.com/mcp", {
          method: "POST",
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })
        }),
        env
      );

    expect((await call("pincode_lookup", { pincode: "751001" })).status).toBe(200);
    expect((await call("pincode_lookup", { pincode: "751001" })).status).toBe(200);
    expect((await call("ifsc_lookup", { ifsc: "SBIN0000001" })).status).toBe(200);
    expect((await call("ifsc_lookup", { ifsc: "SBIN0000001" })).status).toBe(200);
    expect((await call("mandi_prices", { state: "Odisha", limit: 2 })).status).toBe(200);
    expect((await call("mandi_prices", { state: "Odisha", limit: 2 })).status).toBe(200);

    expect(fetchCalls).toBe(3);
    expect(d1Claims).toBe(1);
  });

  it("signs AWS OGD relay POST requests with HMAC-SHA256 and caches relay responses", async () => {
    let relayCalls = 0;
    const captured: { headers?: Headers; body?: string } = {};
    const cache = createMemoryCache();
    const d1 = createMockD1(0);
    const handler = createHandler({
      cache,
      now: () => new Date("2026-11-25T06:00:00Z"),
      fetchFn: async (input, init) => {
        relayCalls += 1;
        expect(String(input)).toBe("https://relay-example.lambda-url.ap-south-1.on.aws/");
        expect(init?.method).toBe("POST");
        captured.headers = new Headers(init?.headers);
        captured.body = String(init?.body ?? "");
        return new Response(JSON.stringify({ records: [{ commodity: "Wheat" }] }));
      }
    });
    const env: Env = {
      OGD_RELAY_URL: "https://relay-example.lambda-url.ap-south-1.on.aws/",
      OGD_RELAY_SECRET: "relay-hmac-secret-xyz",
      QUOTA_DB: d1.db
    };

    const call = () =>
      handler.fetch(
        new Request("https://india-api.srigenmedia.com/mcp", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 9,
            method: "tools/call",
            params: { name: "mandi_prices", arguments: { state: "Odisha", limit: 2 } }
          })
        }),
        env
      );

    const first = await call();
    expect(first.status).toBe(200);
    expect(await first.text()).toContain("Wheat");
    expect((await call()).status).toBe(200);
    expect(relayCalls).toBe(1);
    expect(captured.headers?.get("x-relay-timestamp")).toMatch(/^\d{10}$/);
    expect(captured.headers?.get("x-relay-signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(captured.body).toContain("9ef84268-d588-465a-a308-a864a43d0070");
  });
});
