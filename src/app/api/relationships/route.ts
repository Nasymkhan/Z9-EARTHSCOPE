import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  fetchNasaPower,
  NasaPowerError,
  validateFetchParams,
  type FetchParams,
  type NasaErrorCode,
} from "@/lib/nasa-power";
import { expectedCalendarSlots, pearsonCorrelation, spearmanCorrelation } from "@/lib/stats";
import { getVariable } from "@/lib/variables";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface RelationshipBody {
  variableX?: string;
  variableY?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  startDate?: string;
  endDate?: string;
  resolution?: string;
}

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

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`relationships:${ip}`, 8, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Relationship limit reached — try again in ${limit.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: RelationshipBody;
  try {
    body = (await req.json()) as RelationshipBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const variableX = String(body.variableX ?? "");
  const variableY = String(body.variableY ?? "");
  const xDefinition = getVariable(variableX);
  const yDefinition = getVariable(variableY);
  if (!xDefinition || !yDefinition || variableX === variableY) {
    return NextResponse.json({ error: "Choose two different supported NASA POWER variables." }, { status: 400 });
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const start = String(body.startDate ?? "");
  const end = String(body.endDate ?? "");
  const resolution = body.resolution;
  if (resolution !== "daily" && resolution !== "monthly") {
    return NextResponse.json({ error: "Resolution must be daily or monthly." }, { status: 400 });
  }

  const paramsX: FetchParams = { variable: variableX, latitude, longitude, start, end, resolution };
  const paramsY: FetchParams = { ...paramsX, variable: variableY };
  try {
    validateFetchParams(paramsX);
    validateFetchParams(paramsY);
  } catch (error) {
    if (error instanceof NasaPowerError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusFor(error.code) });
    }
    return NextResponse.json({ error: "Invalid relationship request." }, { status: 400 });
  }

  try {
    const [seriesX, seriesY] = await Promise.all([fetchNasaPower(paramsX), fetchNasaPower(paramsY)]);
    const yByDate = new Map(seriesY.points.map((point) => [point.t, point.v]));
    const aligned = seriesX.points.flatMap((point) => {
      const y = yByDate.get(point.t);
      return y === undefined ? [] : [{ t: point.t, x: point.v, y }];
    });

    if (aligned.length < 3) {
      return NextResponse.json(
        { error: "Fewer than three matching observations are available for this variable pair and period." },
        { status: 422 }
      );
    }

    const xValues = aligned.map((point) => point.x);
    const yValues = aligned.map((point) => point.y);
    const chartStride = Math.max(1, Math.ceil(aligned.length / 1500));
    const chartPoints = aligned.filter((_, index) => index % chartStride === 0);
    if (chartPoints.at(-1)?.t !== aligned.at(-1)?.t) chartPoints.push(aligned[aligned.length - 1]);

    return NextResponse.json({
      variables: {
        x: { code: variableX, name: xDefinition.name, unit: seriesX.meta.unit },
        y: { code: variableY, name: yDefinition.name, unit: seriesY.meta.unit },
      },
      location: {
        name: String(body.locationName ?? "").trim().slice(0, 120) || "Selected location",
        latitude,
        longitude,
      },
      period: { start, end, resolution },
      source: seriesX.meta.source,
      fetchedAt: new Date().toISOString(),
      matchedObservations: aligned.length,
      expectedSlots: expectedCalendarSlots(start, end, resolution),
      pearson: pearsonCorrelation(xValues, yValues),
      spearman: spearmanCorrelation(xValues, yValues),
      chartPoints,
      note: "Concurrent seasonal cycles and long-term trends may contribute to these associations. Correlation does not establish causation.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof NasaPowerError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusFor(error.code) });
    }
    console.error("[relationships] NASA POWER relationship request failed:", error);
    return NextResponse.json({ error: "Could not calculate the relationship from NASA POWER observations." }, { status: 502 });
  }
}
