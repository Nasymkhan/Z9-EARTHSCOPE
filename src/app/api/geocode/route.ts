import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/cities";
import { clientIp, rateLimit, TtlCache } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const cache = new TtlCache<unknown[]>(300);

interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  kind?: string;
}

function displayCountryName(country?: string) {
  return country?.trim().toLowerCase() === "israel" ? "Occupied Palestine" : country;
}

function displayPlaceName(name: string, country?: string) {
  const allParts = name.split(",").map((part) => part.trim()).filter(Boolean);
  const sourceCountry = country ?? allParts.find((part) => part.toLowerCase() === "israel");
  const displayCountry = displayCountryName(sourceCountry);
  const parts = allParts.slice(0, 3);
  if (!sourceCountry || !displayCountry || displayCountry === sourceCountry) return parts.join(", ");

  const countryIndex = parts.findIndex((part) => part.toLowerCase() === sourceCountry.toLowerCase());
  if (countryIndex >= 0) parts[countryIndex] = displayCountry;
  else if (parts.length < 3) parts.push(displayCountry);
  else parts[parts.length - 1] = displayCountry;
  return parts.join(", ");
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`geocode:${ip}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests.", results: [] }, { status: 429 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ results: [] });
  }
  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json({ results: cached, source: "cache" });

  // 1) Instant built-in gazetteer matches
  const local = searchCities(q, 6).map((c) => {
    const country = displayCountryName(c.country);
    return {
      name: `${c.name}, ${country}`,
      latitude: c.latitude,
      longitude: c.longitude,
      country,
      kind: "city",
    };
  });

  // 2) Live OpenStreetMap Nominatim lookup (bounded timeout, identifying UA)
  let remote: GeocodeResult[] = [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=${encodeURIComponent(q)}`,
      {
        headers: { "User-Agent": "Z9-EarthScope/1.0 (NASA Space Apps 2026; contact: z9space.labs)" },
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 86400 },
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { display_name?: string; lat?: string; lon?: string; type?: string; address?: { country?: string } }[];
      remote = data
        .filter((d) => d.display_name && d.lat && d.lon)
        .map((d) => {
          const originalName = d.display_name!;
          const originalCountry = d.address?.country ?? originalName.split(",").map((part) => part.trim()).find((part) => part.toLowerCase() === "israel");
          return {
            name: displayPlaceName(originalName, originalCountry),
            latitude: Number(Number(d.lat).toFixed(4)),
            longitude: Number(Number(d.lon).toFixed(4)),
            country: displayCountryName(originalCountry),
            kind: d.type ?? "place",
          };
        });
    }
  } catch {
    // Geocoder unreachable — local gazetteer results still returned.
  }

  // Merge, de-duplicated by rounded coordinates; local matches first.
  const seen = new Set<string>();
  const merged: GeocodeResult[] = [];
  for (const item of [...local, ...remote]) {
    const key = `${item.latitude.toFixed(1)}|${item.longitude.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 8) break;
  }
  cache.set(cacheKey, merged, 24 * 3600_000);
  return NextResponse.json({ results: merged, source: remote.length ? "nominatim+gazetteer" : "gazetteer" });
}
