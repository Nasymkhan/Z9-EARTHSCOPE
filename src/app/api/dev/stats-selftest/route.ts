import { NextResponse } from "next/server";
import {
  analyzeSeries,
  detectSeasonalAnomalies,
  pearsonCorrelation,
  spearmanCorrelation,
  type CleanPoint,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

interface SelfTestCase {
  name: string;
  expected: string;
  series: CleanPoint[];
  resolution: "daily" | "monthly";
}

function mulberry(seedIn: number) {
  let seed = seedIn >>> 0;
  return () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 2246822507)) >>> 0;
    seed = (Math.imul(seed ^ (seed >>> 13), 3266489909)) >>> 0;
    return ((seed ^= seed >>> 16) >>> 0) / 4294967295;
  };
}

function buildCases(): SelfTestCase[] {
  const rand = mulberry(12345);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.732;
  const makeSeries = (kind: "increasing" | "decreasing" | "flat" | "seasonal", n: number, opts: { noise?: number; missingEvery?: number } = {}): CleanPoint[] => {
    const pts: CleanPoint[] = [];
    const t0 = Date.UTC(2000, 0, 15);
    for (let i = 0; i < n; i++) {
      const d = new Date(t0);
      d.setUTCMonth(d.getUTCMonth() + i);
      const t = d.toISOString().slice(0, 7);
      const year = 1970 + d.getTime() / (365.25 * 86400000);
      const seasonalPhase = ((d.getUTCMonth() * 30.44) % 365.25) / 365.25;
      let v = 15;
      if (kind === "increasing") v += 0.25 * (i / 12);
      else if (kind === "decreasing") v -= 0.25 * (i / 12);
      else if (kind === "seasonal") v += 8 * Math.sin(seasonalPhase * 2 * Math.PI) + 0.25 * (i / 12);
      v += gauss() * (opts.noise ?? 1.2);
      if (opts.missingEvery && i % opts.missingEvery === 3) continue;
      pts.push({ t, year, v: Math.round(v * 1000) / 1000 });
    }
    return pts;
  };
  return [
    { name: "Increasing trend (+2.5 °C/decade, σ=1.2)", expected: "increasing", series: makeSeries("increasing", 240), resolution: "monthly" },
    { name: "Decreasing trend (−2.5 °C/decade, σ=1.2)", expected: "decreasing", series: makeSeries("decreasing", 240), resolution: "monthly" },
    { name: "Flat series (noise only)", expected: "not-significant", series: makeSeries("flat", 240), resolution: "monthly" },
    { name: "Seasonal cycle + increase (+2.5 °C/decade)", expected: "increasing", series: makeSeries("seasonal", 240), resolution: "monthly" },
    { name: "Increasing trend with ~15% missing observations", expected: "increasing", series: makeSeries("increasing", 240, { missingEvery: 7 }), resolution: "monthly" },
    { name: "Flat series, high noise (σ=6)", expected: "not-significant", series: makeSeries("flat", 240, { noise: 6 }), resolution: "monthly" },
  ];
}

function runFeatureChecks() {
  const anomalySeries: CleanPoint[] = [];
  for (let year = 2000; year < 2012; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthLabel = String(month).padStart(2, "0");
      const monthNumber = month - 1;
      const date = new Date(Date.UTC(year, monthNumber, 15));
      const seasonal = 2 * Math.sin((monthNumber / 12) * 2 * Math.PI);
      const noise = (((year * 17 + month * 11) % 7) - 3) * 0.14;
      const spike = year === 2006 && month === 5 ? 20 : 0;
      anomalySeries.push({
        t: `${year}-${monthLabel}`,
        year: 1970 + date.getTime() / (365.25 * 86400000),
        v: 20 + 0.03 * (year - 2000) + seasonal + noise + spike,
      });
    }
  }
  const anomalies = detectSeasonalAnomalies(anomalySeries);
  const anomalyPass = anomalies.available && anomalies.anomalies.some((point) => point.t === "2006-05");

  const tiedX = [1, 1, 2, 3, 4, 4];
  const tiedY = [2, 3, 4, 5, 6, 6];
  const pearson = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
  const spearman = spearmanCorrelation(tiedX, tiedY);
  const correlationPass = pearson !== null && Math.abs(pearson - 1) < 1e-12 && spearman !== null && spearman > 0.95;

  return [
    {
      case: "Seasonal MAD flags an injected outlier after trend removal",
      pass: anomalyPass,
      detected: anomalies.anomalies.find((point) => point.t === "2006-05")?.robustZ ?? null,
      baselineMonths: anomalies.comparableMonths,
    },
    {
      case: "Pearson and tie-aware Spearman correlation",
      pass: correlationPass,
      pearson,
      spearman,
    },
  ];
}

/**
 * GET /api/dev/stats-selftest
 * Runs the scientific engine against deterministic synthetic datasets.
 * Never touches the network or real data — pure engine QA.
 */
export async function GET() {
  const cases = buildCases();
  const featureChecks = runFeatureChecks();
  const results = cases.map((c) => {
    const core = analyzeSeries(c.series, { alpha: 0.05, resolution: c.resolution, expectedSlots: 240 });
    return {
      case: c.name,
      expected: c.expected,
      got: core.verdict,
      pass: core.verdict === c.expected,
      senSlopePerDecade: +core.senSlopePerDecade.toFixed(3),
      mkZ: +core.mkZ.toFixed(3),
      primaryTest: core.primaryTest,
      primaryPValue: +core.primaryPValue.toFixed(6),
      nObs: core.nObs,
    };
  });
  const passed = results.filter((r) => r.pass).length + featureChecks.filter((r) => r.pass).length;
  const total = results.length + featureChecks.length;
  return NextResponse.json({
    engine: "z9-earthscope-stats/1.0 (OLS · Theil–Sen · Mann–Kendall · Seasonal MK)",
    passed: `${passed}/${total}`,
    allPass: passed === total,
    note: "Synthetic deterministic datasets — validates engine correctness, not climate science.",
    results,
    featureChecks,
  });
}
