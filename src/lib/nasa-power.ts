// ============================================================================
// Z9 EarthScope — NASA POWER data adapter (server-side only)
// https://power.larc.nasa.gov/docs/
//
// Security posture:
//   • Runs only on the server (API routes) — never in the browser bundle
//   • Strict input validation; no user-controlled URLs
//   • Hard timeout + bounded retries
//   • NASA fill values (-999) treated as MISSING, never as measurements
//   • Monthly endpoint is annual-granularity upstream; we clip client-side
// ============================================================================

import {
  getVariable,
  POWER_COMMUNITY,
  POWER_FILL_VALUE,
  POWER_SOURCE,
  POWER_AVAILABLE_FROM,
  type Resolution,
} from "./variables";
import { isoToDecimalYear, type CleanPoint } from "./stats";

export type NasaErrorCode =
  | "validation"
  | "timeout"
  | "http"
  | "parse"
  | "empty"
  | "upstream"
  | "unavailable";

export class NasaPowerError extends Error {
  code: NasaErrorCode;
  status?: number;
  constructor(code: NasaErrorCode, message: string, status?: number) {
    super(message);
    this.name = "NasaPowerError";
    this.code = code;
    this.status = status;
  }
}

export interface FetchParams {
  variable: string;
  latitude: number;
  longitude: number;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  resolution: Resolution;
}

export interface NasaObservation {
  date: string; // YYYY-MM-DD or YYYY-MM
  value: number;
}

export interface NasaSeriesMeta {
  source: string;
  community: string;
  parameter: string;
  parameterLong: string;
  unit: string;
  unitRaw: string; // raw unit token from the API (e.g. "C")
  fillValue: number;
  requestedAt: string;
  temporalApi: string;
}

const UNIT_MAP: Record<string, string> = {
  "C": "°C", "mm/day": "mm/day", "%": "%", "m/s": "m/s",
  "MJ/m^2/day": "MJ/m²/day", "kW-hr/m^2/day": "kW-hr/m²/day",
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function validateFetchParams(p: FetchParams): void {
  const v = getVariable(p.variable);
  if (!v) {
    throw new NasaPowerError("validation", `Unsupported parameter code "${p.variable}". Supported: T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN.`);
  }
  if (!isFiniteNumber(p.latitude) || Math.abs(p.latitude) > 90) {
    throw new NasaPowerError("validation", "Latitude must be a number between -90 and 90.");
  }
  if (!isFiniteNumber(p.longitude) || Math.abs(p.longitude) > 180) {
    throw new NasaPowerError("validation", "Longitude must be a number between -180 and 180.");
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(p.start) || !dateRe.test(p.end)) {
    throw new NasaPowerError("validation", "Dates must be in YYYY-MM-DD format.");
  }
  if (p.start < POWER_AVAILABLE_FROM) {
    throw new NasaPowerError("unavailable", `NASA POWER data is available from ${POWER_AVAILABLE_FROM}. Please choose a later start date.`);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (p.end > today) {
    throw new NasaPowerError("validation", `End date is in the future. NASA POWER currently provides data up to ${today}.`);
  }
  if (p.start > p.end) {
    throw new NasaPowerError("validation", "Start date must be on or before the end date.");
  }
  const spanDays = (Date.parse(p.end) - Date.parse(p.start)) / 86400000;
  if (p.resolution === "daily" && spanDays > 366 * 45) {
    throw new NasaPowerError("validation", "Daily requests are limited to a 45-year span. Narrow the range or switch to monthly.");
  }
  if (p.resolution === "monthly" && spanDays < 365) {
    throw new NasaPowerError("validation", "Monthly analysis requires at least a 1-year range for meaningful statistics.");
  }
}

async function fetchJsonWithRetry(url: string, timeoutMs = 60000, retries = 2): Promise<unknown> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "Z9-EarthScope/1.0 (NASA Space Apps 2026)" },
        cache: "no-store",
      });
      if (res.status === 429) {
        throw new NasaPowerError("http", "NASA POWER rate limit exceeded (HTTP 429). Wait a moment and retry.", 429);
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new NasaPowerError("http", `NASA POWER responded with HTTP ${res.status}. ${text.slice(0, 300)}`, res.status);
      }
      return (await res.json()) as unknown;
    } catch (err) {
      if (err instanceof NasaPowerError) {
        if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) throw err; // don't retry 4xx
        lastErr = err;
      } else if ((err as Error).name === "AbortError") {
        lastErr = new NasaPowerError("timeout", `NASA POWER request timed out after ${timeoutMs / 1000}s.`);
      } else {
        lastErr = new NasaPowerError("http", `Network error contacting NASA POWER: ${(err as Error).message}`);
      }
      if (attempt < retries) await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new NasaPowerError("http", "Unknown NASA POWER failure.");
}

interface PowerPointResponse {
  properties?: { parameter?: Record<string, Record<string, number>> };
  parameters?: Record<string, { units?: string; longname?: string }>;
  header?: { fill_value?: number; title?: string; sources?: string[] };
  messages?: string[];
  errors?: string[];
}

export async function fetchNasaPower(p: FetchParams): Promise<{ points: CleanPoint[]; meta: NasaSeriesMeta; observations: number }> {
  validateFetchParams(p);
  const v = getVariable(p.variable)!;
  const reqYear = p.start.slice(0, 4), reqEndYear = p.end.slice(0, 4);

  let url: string;
  if (p.resolution === "daily") {
    const s = p.start.replaceAll("-", "");
    const e = p.end.replaceAll("-", "");
    url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${encodeURIComponent(p.variable)}&community=${POWER_COMMUNITY}&longitude=${p.longitude}&latitude=${p.latitude}&start=${s}&end=${e}&format=JSON`;
  } else {
    // Monthly endpoint is calendar-year granular upstream — request years, then clip.
    url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${encodeURIComponent(p.variable)}&community=${POWER_COMMUNITY}&longitude=${p.longitude}&latitude=${p.latitude}&start=${reqYear}&end=${reqEndYear}&format=JSON`;
  }

  const raw = (await fetchJsonWithRetry(url)) as PowerPointResponse;

  if (raw.messages?.length || raw.errors?.length) {
    const msg = [...(raw.messages ?? []), ...(raw.errors ?? [])].join(" ");
    if (/parameter/i.test(msg) && /not/i.test(msg)) {
      throw new NasaPowerError("upstream", `NASA POWER rejected parameter ${p.variable}: ${msg.slice(0, 300)}`);
    }
    throw new NasaPowerError("upstream", `NASA POWER could not complete the request: ${msg.slice(0, 300)}`);
  }

  const series = raw.properties?.parameter?.[p.variable];
  if (!series || typeof series !== "object") {
    throw new NasaPowerError("parse", "Malformed NASA POWER response — missing the parameter block.");
  }

  const unitRaw = raw.parameters?.[p.variable]?.units ?? "";
  const longname = raw.parameters?.[p.variable]?.longname ?? v.longName;
  const fillValue = raw.header?.fill_value ?? POWER_FILL_VALUE;

  const points: CleanPoint[] = [];
  for (const [key, value] of Object.entries(series)) {
    if (!isFiniteNumber(value) || value === fillValue || value <= -998) continue; // missing
    let label: string;
    if (p.resolution === "daily") {
      label = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
    } else {
      const month = key.slice(4, 6);
      if (month === "13") continue; // YYYY13 is the ANNUAL aggregate, not a month
      label = `${key.slice(0, 4)}-${month}`;
      // clip to requested range (monthly endpoint returns whole years)
      const startMonth = p.start.slice(0, 7), endMonth = p.end.slice(0, 7);
      if (label < startMonth || label > endMonth) continue;
    }
    points.push({ t: label, year: isoToDecimalYear(label), v: value });
  }

  points.sort((a, b) => (a.t < b.t ? -1 : 1));

  if (points.length === 0) {
    throw new NasaPowerError(
      "empty",
      "NASA POWER returned no valid observations for this selection. Check the date range (daily data lag recent days) or the coordinates."
    );
  }

  const meta: NasaSeriesMeta = {
    source: POWER_SOURCE,
    community: POWER_COMMUNITY,
    parameter: p.variable,
    parameterLong: longname,
    unit: UNIT_MAP[unitRaw] ?? unitRaw ?? v.unit,
    unitRaw,
    fillValue,
    requestedAt: new Date().toISOString(),
    temporalApi: p.resolution === "daily" ? "temporal/daily/point (v2.10.0)" : "temporal/monthly/point (v2.10.0)",
  };

  return { points, meta, observations: points.length };
}

// ------------------------------------------------------------------ demo mode
// Synthetic, clearly-labelled demonstration series used ONLY when explicitly
// requested by the user after a live fetch failure. Never presented as NASA data.

export function generateDemoSeries(p: FetchParams): { points: CleanPoint[]; meta: NasaSeriesMeta; observations: number } {
  validateFetchParams(p);
  const v = getVariable(p.variable)!;
  // Deterministic pseudo-random generator seeded by the request — stable, not random fake data presented as real.
  let seed = 2166136261 >>> 0;
  const seedStr = `${p.variable}|${p.latitude.toFixed(2)}|${p.longitude.toFixed(2)}|${p.start}|${p.end}|${p.resolution}`;
  for (let i = 0; i < seedStr.length; i++) {
    seed ^= seedStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967295;
  };
  const baselines: Record<string, { mean: number; amp: number; driftPerYr: number; noise: number }> = {
    T2M: { mean: 18, amp: 9, driftPerYr: 0.028, noise: 2.6 },
    T2M_MAX: { mean: 24, amp: 10, driftPerYr: 0.031, noise: 3.0 },
    T2M_MIN: { mean: 12, amp: 8, driftPerYr: 0.024, noise: 2.3 },
    PRECTOTCORR: { mean: 2.4, amp: 1.6, driftPerYr: -0.012, noise: 1.9 },
    RH2M: { mean: 52, amp: 12, driftPerYr: -0.05, noise: 7 },
    WS2M: { mean: 2.6, amp: 0.7, driftPerYr: 0.008, noise: 0.6 },
    ALLSKY_SFC_SW_DWN: { mean: 18, amp: 7.5, driftPerYr: 0.01, noise: 2.4 },
  };
  const prof = baselines[p.variable] ?? baselines.T2M;
  const points: CleanPoint[] = [];
  const startMs = Date.parse(`${p.start}T00:00:00Z`);
  const endMs = Date.parse(`${p.end}T00:00:00Z`);
  const step = p.resolution === "daily" ? 86400000 : 30.44 * 86400000;
  const baseYear = 1970 + startMs / (365.25 * 86400000);
  for (let ms = startMs; ms <= endMs; ms += step) {
    const d = new Date(ms);
    if (p.resolution === "monthly" && points.length && points[points.length - 1].t.slice(0, 7) === d.toISOString().slice(0, 7)) continue;
    const label = p.resolution === "daily" ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7);
    const year = isoToDecimalYear(label);
    const doy = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000;
    const seasonal = Math.sin(((doy - 105) / 365.25) * 2 * Math.PI) * prof.amp;
    const drift = prof.driftPerYr * (year - baseYear);
    const noise = (rand() + rand() + rand() - 1.5) * prof.noise;
    const value = prof.mean + seasonal + drift + noise;
    points.push({ t: label, year, v: Math.round(value * 100) / 100 });
  }
  const meta: NasaSeriesMeta = {
    source: "Z9 EarthScope SYNTHETIC DEMO (not a NASA observation)",
    community: "DEMO",
    parameter: p.variable,
    parameterLong: `${v.longName} — synthetic demonstration series`,
    unit: v.unit,
    unitRaw: "demo",
    fillValue: POWER_FILL_VALUE,
    requestedAt: new Date().toISOString(),
    temporalApi: "deterministic synthetic generator (demo mode)",
  };
  return { points, meta, observations: points.length };
}
