"""India Public APIs MCP server: catalog tools + live tools for open / free-key Indian APIs."""
import json, os, time
from pathlib import Path
import httpx
from fastmcp import FastMCP

_DATA_PATH = Path(__file__).parent.parent / "data" / "india_public_apis.json"
if not _DATA_PATH.exists():
    _DATA_PATH = Path(__file__).parent / "india_public_apis.json"
CATALOG = json.loads(_DATA_PATH.read_text(encoding="utf-8"))["apis"]
mcp = FastMCP("india-public-apis")
_cache: dict = {}
TTL, TIMEOUT, MAX_CHARS = 3600, 10.0, 20000


def _get(url: str, params: dict | None = None):
    key = url + json.dumps(params or {}, sort_keys=True)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < TTL:
        return hit[1]
    r = httpx.get(url, params=params, timeout=TIMEOUT, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
        "Accept": "application/json"})
    if r.status_code >= 400:
        raise RuntimeError(f"Upstream {r.url.host} returned HTTP {r.status_code}")  # never echo query (contains API keys)
    try:
        data = r.json()
    except ValueError:
        data = r.text[:MAX_CHARS]
    if len(_cache) > 500:
        _cache.clear()
    _cache[key] = (time.time(), data)
    return data


def _trim(data) -> dict:
    s = json.dumps(data, ensure_ascii=False)
    if len(s) > MAX_CHARS:
        return {"truncated": True, "preview": s[:MAX_CHARS]}
    return data if isinstance(data, dict) else {"result": data}


# ---------------- Catalog tools (offline) ----------------
@mcp.tool
def search_apis(query: str = "", domain: str = "", access_tier: str = "", auth_method: str = "", limit: int = 20) -> list[dict]:
    """Search the catalog of 220 Indian public APIs by keyword, domain, access tier or auth method."""
    q = query.lower()
    out = [a for a in CATALOG
           if (not q or q in (a["name"] + a["provider"] + a["capabilities"] + a["sub_domain"]).lower())
           and (not domain or domain.lower() in a["domain"].lower())
           and (not access_tier or access_tier.lower() == a["access_tier"].lower())
           and (not auth_method or auth_method.lower() == a["auth_method"].lower())]
    return out[: max(1, min(limit, 100))]


@mcp.tool
def get_api(api_id: str) -> dict:
    """Get full metadata for one API by its ID (e.g. IN-API-0001)."""
    return next((a for a in CATALOG if a["id"] == api_id), {"error": f"{api_id} not found"})


@mcp.tool
def list_taxonomy() -> dict:
    """Domain -> sub-domain -> API count taxonomy."""
    t: dict = {}
    for a in CATALOG:
        t.setdefault(a["domain"], {}).setdefault(a["sub_domain"], 0)
        t[a["domain"]][a["sub_domain"]] += 1
    return t


# ---------------- Live tools (no key) ----------------
@mcp.tool
def pincode_lookup(pincode: str) -> dict:
    """Look up post offices, district and state for an Indian 6-digit PIN code (India Post data)."""
    if not (pincode.isdigit() and len(pincode) == 6):
        return {"error": "PIN code must be 6 digits"}
    return _trim(_get(f"https://api.postalpincode.in/pincode/{pincode}"))


@mcp.tool
def ifsc_lookup(ifsc: str) -> dict:
    """Resolve an Indian bank IFSC code to bank, branch, address and supported rails (Razorpay IFSC API)."""
    ifsc = ifsc.strip().upper()
    if len(ifsc) != 11:
        return {"error": "IFSC must be 11 characters"}
    return _trim(_get(f"https://ifsc.razorpay.com/{ifsc}"))


_DIGI = [["F", "C", "9", "8"], ["J", "3", "2", "7"], ["K", "4", "5", "6"], ["L", "M", "P", "T"]]
_B = (2.5, 38.5, 63.5, 99.5)  # minLat, maxLat, minLon, maxLon


@mcp.tool
def digipin_encode(lat: float, lon: float) -> dict:
    """Encode latitude/longitude into India Post's 10-character DIGIPIN (open algorithm, computed locally)."""
    mnlat, mxlat, mnlon, mxlon = _B
    if not (mnlat <= lat <= mxlat and mnlon <= lon <= mxlon):
        return {"error": "coordinates outside India DIGIPIN bounds"}
    code = ""
    for lvl in range(1, 11):
        ld, nd = (mxlat - mnlat) / 4, (mxlon - mnlon) / 4
        r = 3 - min(3, int((lat - mnlat) / ld))
        c = min(3, int((lon - mnlon) / nd))
        code += _DIGI[r][c]
        if lvl in (3, 6):
            code += "-"
        mxlat, mnlat = mnlat + ld * (4 - r), mnlat + ld * (3 - r)
        mnlon, mxlon = mnlon + nd * c, mnlon + nd * (c + 1)
    return {"digipin": code}


@mcp.tool
def digipin_decode(digipin: str) -> dict:
    """Decode a DIGIPIN back to the centre latitude/longitude of its ~4m grid cell."""
    mnlat, mxlat, mnlon, mxlon = _B
    pos = {ch: (r, c) for r, row in enumerate(_DIGI) for c, ch in enumerate(row)}
    s = digipin.replace("-", "").upper()
    if len(s) != 10 or any(ch not in pos for ch in s):
        return {"error": "invalid DIGIPIN"}
    for ch in s:
        r, c = pos[ch]
        ld, nd = (mxlat - mnlat) / 4, (mxlon - mnlon) / 4
        mxlat, mnlat = mnlat + ld * (4 - r), mnlat + ld * (3 - r)
        mnlon, mxlon = mnlon + nd * c, mnlon + nd * (c + 1)
    return {"lat": round((mnlat + mxlat) / 2, 6), "lon": round((mnlon + mxlon) / 2, 6)}


# ---------------- Live tools (free key; disabled until secret is set) ----------------
OGD_KEY = os.environ.get("OGD_KEY", "")


def _ogd(resource_id: str, filters: dict | None, limit: int) -> dict:
    if not OGD_KEY:
        return {"error": "OGD_KEY not configured. Get a free key at https://data.gov.in and add Secret Manager secret 'ogd-key'."}
    p = {"api-key": OGD_KEY, "format": "json", "limit": max(1, min(limit, 100))}
    for k, v in (filters or {}).items():
        p[f"filters[{k}]"] = v
    return _trim(_get(f"https://api.data.gov.in/resource/{resource_id}", p))


@mcp.tool
def ogd_dataset_query(resource_id: str, filters: dict | None = None, limit: int = 10) -> dict:
    """Query any data.gov.in OGD resource by resource_id (requires OGD_KEY). filters e.g. {"state": "Odisha"}."""
    return _ogd(resource_id, filters, limit)


@mcp.tool
def mandi_prices(state: str = "", commodity: str = "", limit: int = 20) -> dict:
    """Current daily mandi (Agmarknet) commodity prices via data.gov.in (requires OGD_KEY)."""
    f = {k: v for k, v in {"state.keyword": state, "commodity": commodity}.items() if v}
    return _ogd("9ef84268-d588-465a-a308-a864a43d0070", f, limit)


app = mcp.http_app(path="/mcp", stateless_http=True)

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), path="/mcp", stateless_http=True)
