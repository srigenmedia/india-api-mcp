import { Env, QuotaCheckResult } from "./types";

/** Parse a positive integer env var with a safe fallback. */
export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Non-PII 32-bit FNV-1a hex digest for structured request logging. */
export function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** UTC YYYY-MM-DD key for daily OGD quota accounting. */
export function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Whole seconds remaining until the next 00:00:00 UTC rollover. */
export function secondsUntilUtcMidnight(now = new Date()): number {
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(1, Math.ceil((nextMidnight - now.getTime()) / 1000));
}

/** Check per-IP rate limit using Cloudflare Workers Rate Limiting binding. */
export async function checkIpRateLimit(env: Env, ip: string): Promise<QuotaCheckResult> {
  if (!env.IP_RATE_LIMITER) {
    return { allowed: true, status: 200, code: "OK", message: "OK", retryAfterSec: 0 };
  }
  try {
    const { success } = await env.IP_RATE_LIMITER.limit({ key: ip || "unknown" });
    if (!success) {
      const rpm = parsePositiveInt(env.IP_RPM_LIMIT, 30);
      return {
        allowed: false,
        status: 429,
        code: "IP_RATE_LIMITED",
        message: `Rate limit exceeded (${rpm} requests/min per IP). Please retry shortly.`,
        retryAfterSec: 60
      };
    }
    return { allowed: true, status: 200, code: "OK", message: "OK", retryAfterSec: 0 };
  } catch {
    return {
      allowed: false,
      status: 503,
      code: "RATE_LIMITER_UNAVAILABLE",
      message: "Rate limiter unavailable",
      retryAfterSec: 60
    };
  }
}

/** Atomically claim one daily uncached OGD upstream slot in D1 (fail-closed). */
export async function claimOgdDailyQuota(env: Env, now = new Date()): Promise<QuotaCheckResult> {
  if (!env.QUOTA_DB) {
    return {
      allowed: false,
      status: 503,
      code: "QUOTA_STORE_UNAVAILABLE",
      message: "OGD quota store unavailable",
      retryAfterSec: 60
    };
  }
  const limit = parsePositiveInt(env.OGD_DAILY_LIMIT, 500);
  const day = utcDayKey(now);
  const ts = now.toISOString();
  try {
    const res = await env.QUOTA_DB.prepare(
      "INSERT INTO ogd_daily_usage (day, count, updated_at) VALUES (?1, 1, ?2) " +
        "ON CONFLICT(day) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at WHERE count < ?3"
    )
      .bind(day, ts, limit)
      .run();
    if ((res.meta?.changes ?? 0) !== 1) {
      return {
        allowed: false,
        status: 429,
        code: "OGD_DAILY_CAP_EXCEEDED",
        message: `Daily OGD API quota reached (${limit}/day). Offline catalog, DIGIPIN, PIN, and IFSC tools remain available.`,
        retryAfterSec: secondsUntilUtcMidnight(now)
      };
    }
    return { allowed: true, status: 200, code: "OK", message: "OK", retryAfterSec: 0 };
  } catch {
    return {
      allowed: false,
      status: 503,
      code: "QUOTA_STORE_UNAVAILABLE",
      message: "OGD quota store unavailable",
      retryAfterSec: 60
    };
  }
}

/** Read current UTC daily OGD upstream call count for /health reporting. */
export async function readOgdDailyCount(env: Env, now = new Date()): Promise<number | null> {
  if (!env.QUOTA_DB) return null;
  try {
    const row = await env.QUOTA_DB.prepare("SELECT count FROM ogd_daily_usage WHERE day = ?1")
      .bind(utcDayKey(now))
      .first<{ count: number }>();
    return typeof row?.count === "number" ? row.count : 0;
  } catch {
    return null;
  }
}
