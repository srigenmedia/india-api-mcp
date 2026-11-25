import { describe, expect, it } from "vitest";
import { createHandler } from "../src/index";
import { Env } from "../src/types";

const STACK_RE = /\bat\s+\S+\s+\(|\.ts:\d+|\.mjs:\d+|Error:\s/;

function createCappedD1(initialCount: number) {
  let count = initialCount;
  return {
    prepare() {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              const limit = Number(args[2] ?? 500);
              if (count >= limit) return { success: true, meta: { changes: 0 } };
              count += 1;
              return { success: true, meta: { changes: 1 } };
            },
            async first<T>() {
              return { count } as T;
            }
          };
        }
      };
    }
  } as unknown as D1Database;
}

describe("india-api-mcp negative VAPT & quota guardrails", () => {
  it("enforces per-IP rate limit with 429 and Retry-After", async () => {
    let calls = 0;
    const handler = createHandler({ cache: null });
    const env: Env = {
      IP_RPM_LIMIT: "30",
      IP_RATE_LIMITER: {
        async limit() {
          calls += 1;
          return { success: calls <= 1 };
        }
      }
    };

    const req = () =>
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        headers: { "cf-connecting-ip": "203.0.113.10" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
      });

    expect((await handler.fetch(req(), env)).status).toBe(200);
    const blocked = await handler.fetch(req(), env);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    const txt = await blocked.text();
    expect(txt).toContain("fde.srigenmedia.com/?utm_source=india-api-mcp");
    expect(txt).not.toMatch(STACK_RE);
  });

  it("enforces 500/day OGD cap while keeping offline catalog and DIGIPIN alive", async () => {
    let upstreamCalls = 0;
    const handler = createHandler({
      cache: null,
      fetchFn: async () => {
        upstreamCalls += 1;
        return new Response(JSON.stringify({ ok: true }));
      }
    });
    const env: Env = {
      OGD_KEY: "super-secret-ogd-key",
      OGD_DAILY_LIMIT: "500",
      QUOTA_DB: createCappedD1(500)
    };

    const ogdRes = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mandi_prices" } })
      }),
      env
    );
    expect(ogdRes.status).toBe(429);
    expect(Number(ogdRes.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(upstreamCalls).toBe(0);
    const ogdText = await ogdRes.text();
    expect(ogdText).toContain("fde.srigenmedia.com/?utm_source=india-api-mcp");
    expect(ogdText).not.toContain("super-secret-ogd-key");
    expect(ogdText).not.toMatch(STACK_RE);

    const catRes = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "search_apis", arguments: { query: "upi" } }
        })
      }),
      env
    );
    expect(catRes.status).toBe(200);
  });

  it("fails closed 503 on D1 outage and never leaks OGD_KEY on upstream errors", async () => {
    let upstreamCalls = 0;
    const handler = createHandler({
      cache: null,
      fetchFn: async () => {
        upstreamCalls += 1;
        return new Response("Forbidden", { status: 403 });
      }
    });

    const noDbRes = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mandi_prices" } })
      }),
      { OGD_KEY: "secret-abc" }
    );
    expect(noDbRes.status).toBe(503);
    expect(upstreamCalls).toBe(0);

    const okDbEnv: Env = { OGD_KEY: "secret-abc", QUOTA_DB: createCappedD1(0) };
    const upstreamErrRes = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "mandi_prices" } })
      }),
      okDbEnv
    );
    expect(upstreamErrRes.status).toBe(200);
    const bodyText = await upstreamErrRes.text();
    expect(bodyText).toContain("HTTP 403");
    expect(bodyText).not.toContain("secret-abc");
    expect(bodyText).not.toMatch(STACK_RE);

    const relayErrRes = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "mandi_prices" } })
      }),
      {
        OGD_RELAY_URL: "https://secret-relay-host.lambda-url.ap-south-1.on.aws/",
        OGD_RELAY_SECRET: "secret-relay-token",
        QUOTA_DB: createCappedD1(0)
      }
    );
    expect(relayErrRes.status).toBe(200);
    const relayErrText = await relayErrRes.text();
    expect(relayErrText).toContain("api.data.gov.in-relay");
    expect(relayErrText).not.toContain("secret-relay-host");
    expect(relayErrText).not.toContain("secret-relay-token");
    expect(relayErrText).not.toMatch(STACK_RE);
  });

  it("rejects raw traversal, bad resource_id, oversized bodies, and JSON-RPC error cases", async () => {
    let upstreamCalls = 0;
    const handler = createHandler({
      cache: null,
      fetchFn: async () => {
        upstreamCalls += 1;
        return new Response("{}");
      }
    });
    const env: Env = { OGD_KEY: "secret-abc", QUOTA_DB: createCappedD1(0) };

    const trav = await handler.fetch(new Request("https://india-api.srigenmedia.com/%2e%2e/etc/passwd"), env);
    expect([400, 404]).toContain(trav.status);

    const rawTrav = await handler.fetch(
      {
        url: "https://india-api.srigenmedia.com/%2e%2e/etc/passwd",
        method: "GET",
        headers: new Headers()
      } as unknown as Request,
      env
    );
    expect(rawTrav.status).toBe(400);

    const badResId = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "ogd_dataset_query", arguments: { resource_id: "../../etc/passwd" } }
        })
      }),
      env
    );
    expect(badResId.status).toBe(200);
    expect(await badResId.text()).toContain("Invalid OGD resource_id");
    expect(upstreamCalls).toBe(0);

    const big = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: "x".repeat(70000)
      }),
      env
    );
    expect(big.status).toBe(413);

    const badJson = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", { method: "POST", body: "{bad" }),
      env
    );
    expect(badJson.status).toBe(400);
    expect((await badJson.json()) as { error: { code: number } }).toMatchObject({ error: { code: -32700 } });

    const badMethod = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "prompts/list" })
      }),
      env
    );
    expect(badMethod.status).toBe(404);
    expect((await badMethod.json()) as { error: { code: number } }).toMatchObject({ error: { code: -32601 } });

    const badResource = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 22,
          method: "resources/read",
          params: { uri: "india-apis://unknown" }
        })
      }),
      env
    );
    expect(badResource.status).toBe(400);
    expect((await badResource.json()) as { error: { code: number } }).toMatchObject({ error: { code: -32602 } });

    const badTool = await handler.fetch(
      new Request("https://india-api.srigenmedia.com/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "nonexistent" } })
      }),
      env
    );
    expect(badTool.status).toBe(400);
    expect((await badTool.json()) as { error: { code: number } }).toMatchObject({ error: { code: -32602 } });
  });
});
