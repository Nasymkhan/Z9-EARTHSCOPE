import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses } from "@/db/schema";
import { buildDeterministicExplanation } from "@/lib/explain";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadAnalysis(id: string) {
  if (!UUID_RE.test(id)) return null;
  try {
    const rows = await getDb().select().from(analyses).where(eq(analyses.id, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    const s = row.series ?? [];
    const slope = row.summary.slopePerYear;
    const intercept = row.summary.intercept;
    const trendLine: { year: number; fit: number }[] = [];
    if (s.length) {
      const x0 = s[0].year, x1 = s[s.length - 1].year, N = 60;
      for (let i = 0; i <= N; i++) {
        const year = x0 + ((x1 - x0) * i) / N;
        trendLine.push({ year, fit: slope * year + intercept });
      }
    }
    return {
      id: row.id,
      payload: row.summary,
      series: s,
      trendLine,
      explanation: buildDeterministicExplanation(row.summary),
      demo: row.summary.community === "DEMO",
      createdAt: (row.createdAt as Date).toISOString(),
    };
  } catch (err) {
    console.error("[loadAnalysis]", err);
    return null;
  }
}
