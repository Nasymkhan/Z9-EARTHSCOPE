import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`analyses:${ip}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  try {
    const rows = await getDb()
      .select({
        id: analyses.id,
        variable: analyses.variable,
        locationName: analyses.locationName,
        latitude: analyses.latitude,
        longitude: analyses.longitude,
        resolution: analyses.resolution,
        startDate: analyses.startDate,
        endDate: analyses.endDate,
        seriesLength: analyses.seriesLength,
        createdAt: analyses.createdAt,
        summary: analyses.summary,
      })
      .from(analyses)
      .orderBy(desc(analyses.createdAt))
      .limit(40);

    const items = rows.map((r) => ({
      id: r.id,
      variable: r.variable,
      variableName: r.summary?.variableName,
      locationName: r.locationName,
      latitude: r.latitude,
      longitude: r.longitude,
      resolution: r.resolution,
      startDate: r.startDate,
      endDate: r.endDate,
      verdict: r.summary?.verdict,
      significant: r.summary?.significant,
      senSlopePerDecade: r.summary?.senSlopePerDecade,
      unit: r.summary?.unit,
      createdAt: r.createdAt,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[analyses] list failed:", err);
    return NextResponse.json({ error: "History store unavailable.", items: [] }, { status: 200 });
  }
}
