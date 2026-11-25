export interface OgdRelayPayload {
  resource_id: string;
  filters: [string, string][];
  limit: number;
}

/** Compute lowercase hex HMAC-SHA256 over `${timestamp}.${body}` using Web Crypto. */
export async function signRelayPayload(secret: string, timestamp: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build a signed POST request targeting the AWS ap-south-1 OGD relay Function URL. */
export async function buildRelayRequest(
  relayUrl: string,
  relaySecret: string,
  payload: OgdRelayPayload,
  now = new Date()
): Promise<{ url: string; init: RequestInit }> {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const signature = await signRelayPayload(relaySecret, timestamp, body);
  return {
    url: relayUrl.trim(),
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-relay-timestamp": timestamp,
        "x-relay-signature": signature
      },
      body
    }
  };
}
