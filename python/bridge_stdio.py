"""Stdio -> Cloud Run MCP bridge. Injects (and auto-refreshes) a gcloud identity token so the private
india-api-mcp service can be used from Antigravity / any stdio MCP client."""
import os, subprocess, time
import httpx
from fastmcp import FastMCP
from fastmcp.client import Client
from fastmcp.client.transports import StreamableHttpTransport

URL = os.environ.get("INDIA_API_MCP_URL", "https://india-api.srigenmedia.com/mcp")


class GcloudIdToken(httpx.Auth):
    def __init__(self):
        self.tok, self.exp = "", 0.0

    def auth_flow(self, request):
        if time.time() > self.exp:
            self.tok = subprocess.run("gcloud auth print-identity-token", shell=True, stdin=subprocess.DEVNULL,
                                      capture_output=True, text=True, check=True, timeout=60).stdout.strip()
            self.exp = time.time() + 45 * 60  # tokens live 60 min
        request.headers["Authorization"] = f"Bearer {self.tok}"
        yield request


proxy = FastMCP.as_proxy(Client(StreamableHttpTransport(URL, auth=GcloudIdToken())), name="india-apis")

if __name__ == "__main__":
    proxy.run(transport="stdio", show_banner=False)
