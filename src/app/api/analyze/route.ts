import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { analyses, type StoredAnalysisPayload, type StoredSeriesPoint } from "@/db/schema";
import { getVariable, POWER_SOURCE } from "@/lib/variables";
import {
  fetchNasaPower,
  generateDemoSeries,
  NasaPowerError,
  type NasaErrorCode,
} from "@/lib/nasa-power";
import { analyzeSeries, expectedCalendarSlots, type CleanPoint } from "@/lib/stats";
import { buildExplanation } from "@/lib/explain";
import { clientIp, rateLimit, TtlCache } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface AnalysisResult {
  id: string | null;
  payload: StoredAnalysisPayload;
  series: StoredSeriesPoint[];
  trendLine: { year: number; fit: number }[];
  explanation: Awaited<ReturnType<typeof buildExplanation>>;
  demo: boolean;
  fromCache: boolean;
  temporalApi: string;
}

const cache = new TtlCache<AnalysisResult>(140);

interface AnalyzeBody {
  variable?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  startDate?: string;
  endDate?: string;
  resolution?: string;
  alpha?: number;
  persist?: boolean;
  demo?: boolean; // only honoured with demoAck:true — synthetic data path
  demoAck?: boolean;
}

const ALPHA_OPTIONS = [0.01, 0.05, 0.1];

function statusFor(code: NasaErrorCode): number {
  switch (code) {
    case "validation": return 400;
    case "unavailable": return 422;
    case "empty": return 422;
    case "timeout": return 504;
    case "http": return 502;
    case "upstream": return 502;
    case "parse": return 502;
  }
}

async function buildAnalysis(
  input: Required<Omit<AnalyzeBody, "demo" | "demoAck">> & { variable: string; resolution: "daily" | "monthly"; demo: boolean }
): Promise<AnalysisResult> {
  const v = getVariable(input.variable)!;
  const fetchParams = {
    variable: input.variable,
    latitude: input.latitude,
    longitude: input.longitude,
    start: input.startDate,
    end: input.endDate,
    resolution: input.resolution,
  };

  const cacheKey = JSON.stringify([fetchParams, input.alpha, input.demo]);
  const days = (Date.parse(input.endDate) - Date.parse(input.startDate)) / 86400000;
  const ttl = input.resolution === "monthly" ? 6 * 3600_000 : days > 3660 ? 3 * 3600_000 : 3600_000;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const { points, meta, observations } = input.demo
    ? generateDemoSeries(fetchParams)
    : await fetchNasaPower(fetchParams);

  const expectedSlots = expectedCalendarSlots(input.startDate, input.endDate, input.resolution);
  const core = analyzeSeries(points, { alpha: input.alpha, resolution: input.resolution, expectedSlots });

  const payload: StoredAnalysisPayload = {
    variable: v.code,
    variableName: v.name,
    variableLong: meta.parameterLong,
    unit: meta.unit,
    community: meta.community,
    resolution: input.resolution,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    startDate: input.startDate,
    endDate: input.endDate,
    alpha: input.alpha,
    source: meta.source,
    requestedAt: meta.requestedAt,
    nObs: observations,
    nExpected: expectedSlots,
    coverage: core.coverage,
    nMissing: core.nMissing,
    nOutliers: core.nOutliers,
    fillValue: meta.fillValue,
    lag1Autocorr: core.lag1Autocorr,
    slopePerYear: core.slopePerYear,
    slopePerDecade: core.slopePerDecade,
    senSlopePerYear: core.senSlopePerYear,
    senSlopePerDecade: core.senSlopePerDecade,
    intercept: core.intercept,
    rSquared: core.rSquared,
    slopeCILower: core.slopeCILower,
    slopeCIUpper: core.slopeCIUpper,
    slopeStdErrPerYear: core.slopeStdErrPerYear,
    olsPValue: core.olsPValue,
    olsTStat: core.olsTStat,
    mkS: core.mkS,
    mkZ: core.mkZ,
    mkPValue: core.mkPValue,
    mkTau: core.mkTau,
    senN: core.senN,
    seasonalMk: core.seasonalMk,
    primaryTest: core.primaryTest,
    primaryPValue: core.primaryPValue,
    verdict: core.verdict,
    significant: core.significant,
    warnings: input.demo
      ? [...core.warnings, "DEMO MODE — this series is synthetic, generated locally for demonstration. It is NOT a NASA observation."]
      : core.warnings,
    computedBy: core.computedBy,
  };

  const stored: StoredSeriesPoint[] = points.map((p: CleanPoint) => ({ t: p.t, year: p.year, v: p.v }));
  const explanation = await buildExplanation(payload);

  return {
    id: null as string | null,
    payload,
    series: stored,
    trendLine: core.trendLine,
    explanation,
    demo: input.demo,
    fromCache: false,
    temporalApi: meta.temporalApi,
  };
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`analyze:${ip}`, 24, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit reached — try again in ${rl.retryAfterSec}s. This protects the free NASA POWER service.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // ---- validation & coercion ------------------------------------------
  const variable = String(body.variable ?? "");
  const v = getVariable(variable);
  if (!v) {
    return NextResponse.json({ error: `Unsupported variable "${variable}".` }, { status: 400 });
  }
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? "");
  const resolution = String(body.resolution ?? "monthly") as "daily" | "monthly";
  if (resolution !== "daily" && resolution !== "monthly") {
    return NextResponse.json({ error: "Resolution must be 'daily' or 'monthly'." }, { status: 400 });
  }
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: "Coordinates are invalid." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD." }, { status: 400 });
  }
  if (startDate < "1984-01-01") {
    return NextResponse.json({ error: "NASA POWER daily data begins on 1984-01-01." }, { status: 400 });
  }
  if (endDate > new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "End date cannot be in the future." }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "Start date must be on or before end date." }, { status: 400 });
  }
  const alpha = ALPHA_OPTIONS.includes(Number(body.alpha)) ? Number(body.alpha) : 0.05;
  const locationName = String(body.locationName ?? "").trim().slice(0, 120) ||
    `Custom point (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;
  const lat = Math.round(latitude * 10000) / 10000;
  const lon = Math.round(longitude * 10000) / 10000;
  const demo = body.demo === true && body.demoAck === true;
  const persist = body.persist !== false;

  try {
    const result = await buildAnalysis({
      variable, latitude: lat, longitude: lon, locationName, startDate, endDate,
      resolution, alpha, persist, demo,
    });

    let id: string | null = result.id;
    if (persist && !result.fromCache) {
      try {
        const rows = await getDb()
          .insert(analyses)
          .values({
            variable,
            locationName,
            latitude: lat,
            longitude: lon,
            resolution,
            startDate,
            endDate,
            summary: result.payload,
            series: result.series,
            seriesLength: result.series.length,
          })
          .returning({ id: analyses.id });
        id = rows[0]?.id ?? null;
      } catch (dbErr) {
        // Persistence is best-effort — never fail a live analysis because history is down.
        console.error("[analyze] history persist failed:", dbErr);
      }
    }

    return NextResponse.json(
      { ...result, id },
      { headers: { "Cache-Control": "private, no-store", "X-Z9-Source": demo ? "synthetic-demo" : "nasa-power" } }
    );
  } catch (err) {
    if (err instanceof NasaPowerError) {
      return NextResponse.json(
        { error: err.message, code: err.code, liveFailed: true },
        { status: statusFor(err.code) }
      );
    }
    console.error("[analyze] unexpected failure:", err);
    return NextResponse.json({ error: "Unexpected internal error during analysis." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Z9 EarthScope — NASA POWER analysis endpoint",
    method: "POST",
    body: {
      variable: "T2M | T2M_MAX | T2M_MIN | PRECTOTCORR | RH2M | WS2M | ALLSKY_SFC_SW_DWN",
      latitude: "number (-90..90)",
      longitude: "number (-180..180)",
      startDate: "YYYY-MM-DD (>= 1984-01-01)",
      endDate: "YYYY-MM-DD (<= today)",
      resolution: "daily | monthly",
      alpha: "0.01 | 0.05 | 0.10 (default 0.05)",
      demo: "boolean — synthetic series, requires demoAck:true, never presented as NASA data",
    },
    docs: "/data-sources#methodology",
    source: POWER_SOURCE,
  });
}
