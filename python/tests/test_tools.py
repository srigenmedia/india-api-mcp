import sys, pathlib, asyncio
sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))
import server
from fastmcp import Client


def fn(t):
    return getattr(t, "fn", t)


def test_catalog():
    assert len(server.CATALOG) >= 120
    assert fn(server.search_apis)(query="aadhaar")
    assert fn(server.get_api)("IN-API-0001")["id"] == "IN-API-0001"
    assert len(fn(server.list_taxonomy)()) >= 8


def test_digipin_roundtrip():
    # Dak Bhawan, New Delhi -> documented DIGIPIN 39J-49L-L8T4
    code = fn(server.digipin_encode)(28.622788, 77.213033)["digipin"]
    assert code == "39J-49L-L8T4"
    d = fn(server.digipin_decode)(code)
    assert abs(d["lat"] - 28.622788) < 1e-4 and abs(d["lon"] - 77.213033) < 1e-4


def test_validation_and_keyless():
    assert "error" in fn(server.pincode_lookup)("12")
    assert "error" in fn(server.ifsc_lookup)("X")
    if not server.OGD_KEY:
        assert "error" in fn(server.ogd_dataset_query)("x")


def test_mcp_protocol():
    async def go():
        async with Client(server.mcp) as c:
            names = {t.name for t in await c.list_tools()}
            assert {"search_apis", "pincode_lookup", "digipin_encode"} <= names
    asyncio.run(go())
