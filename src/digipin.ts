const DIGI_GRID: readonly (readonly string[])[] = [
  ["F", "C", "9", "8"],
  ["J", "3", "2", "7"],
  ["K", "4", "5", "6"],
  ["L", "M", "P", "T"]
];

const BOUNDS = { minLat: 2.5, maxLat: 38.5, minLon: 63.5, maxLon: 99.5 } as const;

const DIGI_POS = new Map<string, [number, number]>();
DIGI_GRID.forEach((row, r) => {
  row.forEach((ch, c) => DIGI_POS.set(ch, [r, c]));
});

/** Encode latitude/longitude into India Post's 10-character DIGIPIN. */
export function digipinEncode(lat: number, lon: number): { digipin: string } | { error: string } {
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "lat and lon must be finite numbers" };
  }
  let { minLat, maxLat, minLon, maxLon } = BOUNDS;
  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
    return { error: "coordinates outside India DIGIPIN bounds" };
  }
  let code = "";
  for (let lvl = 1; lvl <= 10; lvl++) {
    const ld = (maxLat - minLat) / 4;
    const nd = (maxLon - minLon) / 4;
    const r = 3 - Math.min(3, Math.floor((lat - minLat) / ld));
    const c = Math.min(3, Math.floor((lon - minLon) / nd));
    code += DIGI_GRID[r][c];
    if (lvl === 3 || lvl === 6) code += "-";
    maxLat = minLat + ld * (4 - r);
    minLat = minLat + ld * (3 - r);
    minLon = minLon + nd * c;
    maxLon = minLon + nd;
  }
  return { digipin: code };
}

/** Decode a 10-character DIGIPIN back to the centre latitude/longitude of its ~4m cell. */
export function digipinDecode(digipin: string): { lat: number; lon: number } | { error: string } {
  const cleaned = String(digipin ?? "").replace(/-/g, "").trim().toUpperCase();
  if (cleaned.length !== 10) {
    return { error: "invalid DIGIPIN" };
  }
  let { minLat, maxLat, minLon, maxLon } = BOUNDS;
  for (const ch of cleaned) {
    const pos = DIGI_POS.get(ch);
    if (!pos) return { error: "invalid DIGIPIN" };
    const [r, c] = pos;
    const ld = (maxLat - minLat) / 4;
    const nd = (maxLon - minLon) / 4;
    maxLat = minLat + ld * (4 - r);
    minLat = minLat + ld * (3 - r);
    minLon = minLon + nd * c;
    maxLon = minLon + nd;
  }
  return {
    lat: Number(((minLat + maxLat) / 2).toFixed(6)),
    lon: Number(((minLon + maxLon) / 2).toFixed(6))
  };
}
