// ============================================================================
// Z9 EarthScope — Scientific explanation engine
//
// Default mode is DETERMINISTIC: every sentence is generated from the actual
// computed statistics — no external service, no invented numbers.
//
// An optional OpenAI-compatible LLM can be layered on top (AI_API_KEY,
// AI_API_BASE_URL, AI_MODEL). Even then, the model receives ONLY the computed
// result below and is instructed to contradict it never; if the call fails we
// fall back to the deterministic summary and say so.
// ============================================================================

import type { StoredAnalysisPayload as P } from "@/db/schema";

export interface ExplanationResult {
  mode: "deterministic" | "ai-assisted";
  title: string;
  body: string[]; // paragraphs
  limitations: string[];
  generatedAt: string;
  notice: string;
}

function fmtP(p: number): string {
  if (p < 0.0001) return "p < 0.0001";
  return `p = ${p.toFixed(4)}`;
}

function directionWord(v: P["verdict"]): string {
  switch (v) {
    case "increasing": return "an increasing trend";
    case "decreasing": return "a decreasing trend";
    case "not-significant": return "no statistically significant monotonic trend";
    case "insufficient": return "insufficient data for a reliable assessment";
  }
}

export function buildImpactContext(variable: string, verdict: P["verdict"]): string {
  if (verdict === "insufficient") {
    return "The available series is too short for a reliable trend assessment; no impact interpretation is supported.";
  }
  if (verdict === "not-significant") {
    return "The primary trend test did not meet the selected significance threshold. Treat the estimated direction as exploratory.";
  }
  const contexts: Record<string, string> = {
    T2M: "A near-surface temperature signal can motivate follow-up on heat exposure and evaporative demand.",
    T2M_MAX: "A maximum-temperature signal can motivate follow-up on hot-day exposure and seasonal heat conditions.",
    T2M_MIN: "A minimum-temperature signal can motivate follow-up on overnight thermal conditions and growing-season thresholds.",
    PRECTOTCORR: "A precipitation signal can motivate follow-up on water availability and soil-moisture conditions; this series alone does not classify drought or flood events.",
    RH2M: "A relative-humidity signal can motivate follow-up on atmospheric moisture conditions; it does not measure local health or crop outcomes.",
    WS2M: "A wind-speed signal can motivate follow-up on ventilation, transport, and surface-exchange conditions; it is not an extreme-wind warning.",
    ALLSKY_SFC_SW_DWN: "A solar-radiation signal can motivate follow-up on surface energy and solar-resource conditions; cloud and local exposure effects require additional evidence.",
  };
  return contexts[variable] ?? "Use this observed signal as a prompt for local follow-up, not as a direct impact or attribution finding.";
}

export function buildDeterministicExplanation(r: P): ExplanationResult {
  const unit = r.unit;
  const perDecade = Math.abs(r.senSlopePerDecade);
  const dir = r.senSlopePerDecade >= 0 ? "increase" : "decrease";
  const testName = r.primaryTest === "seasonal-mann-kendall" ? "Seasonal Mann–Kendall" : "Mann–Kendall";
  const body: string[] = [];

  body.push(
    `${r.variableName} (${r.variable}) at ${r.locationName} (${r.latitude.toFixed(4)}°, ${r.longitude.toFixed(4)}°) over ${r.startDate} to ${r.endDate} shows ${directionWord(r.verdict)}. The robust Sen (median pairwise) slope estimate is ${perDecade.toFixed(3)} ${unit} per decade (${dir}), based on ${r.senN} ${r.resolution === "daily" ? "monthly-aggregated " : ""}trend points and ${r.nObs.toLocaleString()} valid daily/monthly observations (${(r.coverage * 100).toFixed(1)}% calendar coverage).`
  );

  if (r.verdict === "insufficient") {
    body.push(
      `Statistical testing was not performed because the series contains fewer than 20 valid observations. Widen the date range or verify data availability before drawing conclusions.`
    );
  } else {
    body.push(
      `The ${testName} test reports z = ${Math.abs(r.seasonalMk?.z ?? r.mkZ).toFixed(3)} with ${fmtP(r.primaryPValue)} against a significance threshold of α = ${r.alpha}. ` +
      (r.significant
        ? `Because ${fmtP(r.primaryPValue)} ≤ α = ${r.alpha}, the monotonic trend is classified as statistically significant at the ${(100 * (1 - r.alpha)).toFixed(0)}% confidence level. The ordinary least-squares fit independently estimates a slope of ${r.slopePerDecade.toFixed(3)} ${unit}/decade (R² = ${r.rSquared.toFixed(3)}, two-tailed ${fmtP(r.olsPValue)}; 95% CI ${r.slopeCILower.toFixed(3)} to ${r.slopeCIUpper.toFixed(3)} ${unit}/decade).`
        : `Because ${fmtP(r.primaryPValue)} > α = ${r.alpha}, the monotonic component of the series is not statistically distinguishable from noise at this threshold. The point estimate of change should not be reported as a confirmed trend. OLS gives ${r.slopePerDecade.toFixed(3)} ${unit}/decade (R² = ${r.rSquared.toFixed(3)}), but visual slope alone — however steep — is not evidence of significance.`)
    );
    if (r.seasonalMk) {
      body.push(
        `A seasonal Mann–Kendall test (Hirsch & Slack, 1984) was applied using ${r.seasonalMk.groups} calendar-month groupings (basis: ${r.seasonalMk.basis}) to control for the annual cycle. It returned z = ${Math.abs(r.seasonalMk.z).toFixed(3)}, ${fmtP(r.seasonalMk.pValue)}. The unadjusted Mann–Kendall test returned z = ${Math.abs(r.mkZ).toFixed(3)}, ${fmtP(r.mkPValue)}. The seasonal result is reported as primary.`
      );
    }
  }

  const limitations: string[] = [
    "These statistics describe only the observed NASA POWER grid cell (~0.5° reanalysis/assimilation) for the selected period and resolution — not the exact microclimate of any single ground location, and not the country as a whole.",
    "Statistical significance does not establish causation. A significant trend is consistent with many drivers (natural variability, land-use change, large-scale circulation, forcing agents) and cannot attribute cause.",
    "NASA POWER is a model-assimilated product; it is not the same instrument class as an in-situ weather station record. Cross-check with local gauge/station data where available.",
  ];
  if (r.lag1Autocorr !== null && Math.abs(r.lag1Autocorr) > 0.4) {
    limitations.push(`Residual lag-1 autocorrelation (${r.lag1Autocorr.toFixed(2)}) violates the independence assumption of Mann–Kendall; treat the p-value as optimistic.`);
  }
  if (r.coverage < 0.9) {
    limitations.push(`${(100 * (1 - r.coverage)).toFixed(1)}% of calendar slots were missing (fill value -999 removed). Systematic gaps can bias slope estimates.`);
  }
  if (r.nOutliers > 0) {
    limitations.push(`${r.nOutliers} extreme observations (beyond 1.5×IQR) were retained; Sen's slope was used preferentially because it is insensitive to them.`);
  }

  const notice =
    "This summary was produced by the Z9 EarthScope deterministic interpretation engine directly from the computed statistics — no external AI service was used. It reports observed data behavior only and makes no causal attribution or future prediction.";

  return {
    mode: "deterministic",
    title: "Scientific interpretation",
    body,
    limitations,
    generatedAt: new Date().toISOString(),
    notice,
  };
}

/** Optional LLM layer — returns null unless AI_API_KEY/AI_MODEL are configured or the call fails. */
export async function tryAiNarrative(r: P): Promise<string[] | null> {
  const key = process.env.AI_API_KEY;
  const base = process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_MODEL;
  if (!key || !model) return null;

  const facts = {
    variable: `${r.variableName} (${r.variable}), unit ${r.unit}`,
    location: `${r.locationName} (${r.latitude}, ${r.longitude})`,
    period: `${r.startDate} to ${r.endDate}, ${r.resolution} resolution`,
    validObs: r.nObs,
    coveragePct: +(r.coverage * 100).toFixed(1),
    senSlopePerDecade: r.senSlopePerDecade,
    olsSlopePerDecade: r.slopePerDecade,
    rSquared: r.rSquared,
    primaryTest: r.primaryTest,
    primaryPValue: r.primaryPValue,
    alpha: r.alpha,
    verdict: r.verdict,
    seasonalZ: r.seasonalMk?.z ?? null,
    lag1Autocorr: r.lag1Autocorr,
    source: r.source,
  };

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content:
              "You are a careful Earth-science analyst. You will receive ONLY precomputed statistics. Write 3 short paragraphs: (1) what changed and by how much, (2) whether the trend is statistically supported and at what threshold, (3) what this does NOT show. Never invent numbers, never claim causation, never predict the future. If a value is absent here, do not mention it. Plain language, professional tone, no markdown headers.",
          },
          { role: "user", content: `Interpret these computed results:\n${JSON.stringify(facts, null, 2)}` },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

export async function buildExplanation(r: P): Promise<ExplanationResult> {
  const base = buildDeterministicExplanation(r);
  const aiBody = await tryAiNarrative(r);
  if (!aiBody) return base;
  return {
    ...base,
    mode: "ai-assisted",
    body: aiBody,
    notice:
      "Narrative generated by the configured AI model strictly from the computed statistics above (no external data, no predictions). Numbers must match the statistics panel; the deterministic engine remains the source of truth.",
  };
}
