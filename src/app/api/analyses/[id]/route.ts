import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { buildExplanation } from "@/lib/explain";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid analysis id." }, { status: 400 });
  try {
    const rows = await getDb().select().from(analyses).where(eq(analyses.id, id)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });

    const s = row.series ?? [];
    const slope = row.summary.slopePerYear;
    const intercept = row.summary.intercept;
    let trendLine: { year: number; fit: number }[] = [];
    if (s.length) {
      const x0 = s[0].year, x1 = s[s.length - 1].year, N = 60;
      for (let i = 0; i <= N; i++) {
        const year = x0 + ((x1 - x0) * i) / N;
        trendLine.push({ year, fit: slope * year + intercept });
      }
    }
    const explanation = await buildExplanation(row.summary);
    return NextResponse.json({
      id: row.id,
      payload: row.summary,
      series: row.series,
      trendLine,
      explanation,
      demo: row.summary.community === "DEMO",
      createdAt: row.createdAt,
    });
  } catch (err) {
    console.error("[analyses/[id]] read failed:", err);
    return NextResponse.json({ error: "History store unavailable." }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = clientIp(req);
  if (!rateLimit(`analyses-delete:${ip}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid analysis id." }, { status: 400 });
  try {
    await getDb().delete(analyses).where(eq(analyses.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analyses/[id]] delete failed:", err);
    return NextResponse.json({ error: "History store unavailable." }, { status: 503 });
  }
}
