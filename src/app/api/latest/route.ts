import { NextRequest, NextResponse } from "next/server";
import { getVariable, POWER_COMMUNITY, POWER_FILL_VALUE } from "@/lib/variables";
import { clientIp, rateLimit, TtlCache } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const cache = new TtlCache<unknown>(200);
const UNIT_MAP: Record<string, string> = {
  "C": "°C", "mm/day": "mm/day", "%": "%", "m/s": "m/s",
  "MJ/m^2/day": "MJ/m²/day", "kW-hr/m^2/day": "kW-hr/m²/day",
};

/** GET /api/latest?variable=T2M&lat=33.68&lon=73.05 → newest valid daily observation (last ~16 days). */
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`latest:${ip}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const sp = req.nextUrl.searchParams;
  const variable = String(sp.get("variable") ?? "");
  const v = getVariable(variable);
  const lat = Number(sp.get("lat")), lon = Number(sp.get("lon"));
  if (!v || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Invalid variable or coordinates." }, { status: 400 });
  }
  const key = `${variable}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached);

  const end = new Date();
  const start = new Date(end.getTime() - 15 * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${encodeURIComponent(variable)}&community=${POWER_COMMUNITY}&longitude=${lon}&latitude=${lat}&start=${fmt(start)}&end=${fmt(end)}&format=JSON`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Z9-EarthScope/1.0 (NASA Space Apps 2026)" },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `NASA POWER returned HTTP ${res.status}.` }, { status: 502 });
    }
    const data = (await res.json()) as {
      properties?: { parameter?: Record<string, Record<string, number>> };
      parameters?: Record<string, { units?: string; longname?: string }>;
    };
    const series = data?.properties?.parameter?.[variable];
    if (!series) return NextResponse.json({ error: "Unexpected NASA POWER response." }, { status: 502 });
    const valid = Object.entries(series)
      .filter(([, v]) => typeof v === "number" && v > POWER_FILL_VALUE + 1)
      .sort(([a], [b]) => (a < b ? 1 : -1));
    if (!valid.length) {
      return NextResponse.json({ error: "No valid observation in the last 15 days (NASA daily latency).", unavailable: true }, { status: 200 });
    }
    const [keyDate, value] = valid[0];
    const unitRaw = data.parameters?.[variable]?.units ?? "";
    const payload = {
      variable,
      name: v.name,
      unit: UNIT_MAP[unitRaw] ?? unitRaw ?? v.unit,
      longName: data.parameters?.[variable]?.longname ?? v.longName,
      date: `${keyDate.slice(0, 4)}-${keyDate.slice(4, 6)}-${keyDate.slice(6, 8)}`,
      value,
      source: "NASA POWER — temporal/daily/point",
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, payload, 10 * 60_000);
    return NextResponse.json(payload);
  } catch (err) {
    const msg = (err as Error).name === "TimeoutError" || (err as Error).name === "AbortError"
      ? "NASA POWER timed out — try again shortly."
      : "Could not reach NASA POWER.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
