import asyncio, os, subprocess, sys
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport

URL = os.environ.get("INDIA_API_MCP_URL", "https://india-api.srigenmedia.com/mcp")
tok = subprocess.run("gcloud auth print-identity-token", shell=True, capture_output=True, text=True).stdout.strip()


async def main():
    async with Client(StreamableHttpTransport(URL, headers={"Authorization": f"Bearer {tok}"})) as c:
        tools = [t.name for t in await c.list_tools()]
        print("tools:", tools)
        for name, args in [("search_apis", {"query": "upi", "limit": 2}), ("pincode_lookup", {"pincode": "751001"}),
                           ("ifsc_lookup", {"ifsc": "SBIN0000001"}), ("digipin_encode", {"lat": 20.2961, "lon": 85.8245})]:
            r = await c.call_tool(name, args)
            print(name, "->", str(r.data if r.data is not None else r.content)[:200])

asyncio.run(main())
