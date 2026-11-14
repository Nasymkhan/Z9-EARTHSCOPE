import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createHash } from "node:crypto";
import { ArrowLeft } from "lucide-react";
import { loadAnalysis } from "@/lib/load-analysis";
import { detectSeasonalAnomalies } from "@/lib/stats";
import { buildExplanation, buildImpactContext } from "@/lib/explain";
import PrintButton from "@/components/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Scientific Investigation Report" };

const fmt = (n: number, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const fmtP = (p: number) => (p < 0.0001 ? "< 0.0001" : p.toFixed(4));

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr>
      <th className="border border-[#d3dceb] bg-[#eef2fa] px-3 py-1.5 text-left align-top font-semibold w-[38%]">{k}</th>
      <td className="border border-[#d3dceb] px-3 py-1.5">{v}</td>
    </tr>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="border-b-2 border-[#2563EB] pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[#14243A]">
        <span className="mr-2 text-[#2563EB]">{String(n).padStart(2, "0")}</span>{title}
      </h2>
      <div className="mt-2 text-[11.5px] leading-relaxed">{children}</div>
    </section>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await loadAnalysis(id);
  if (!analysis) notFound();

  const { payload: p, series, trendLine } = analysis;
  const anomalyScan = detectSeasonalAnomalies(series);
  const reportExplanation = await buildExplanation(p);
  const checksum = createHash("sha256")
    .update(JSON.stringify(p) + "|" + JSON.stringify(series))
    .digest("hex")
    .slice(0, 16);

  // ---------- inline SVG figure ----------
  const W = 760, H = 200, PL = 48, PR = 10, PT = 10, PB = 24;
  const stride = Math.max(1, Math.ceil(series.length / 620));
  const pts = series.filter((_, i) => i % stride === 0);
  const x0 = series[0]?.year ?? 0, x1 = series[series.length - 1]?.year ?? 1;
  const vs = series.map((s) => s.v);
  let yMin = Math.min(...vs), yMax = Math.max(...vs);
  const pad = (yMax - yMin) * 0.08 || 1;
  yMin -= pad; yMax += pad;
  const sx = (y: number) => PL + ((y - x0) / Math.max(1e-9, x1 - x0)) * (W - PL - PR);
  const sy = (v: number) => PT + (1 - (v - yMin) / (yMax - yMin)) * (H - PT - PB);
  const obsPath = pts.map((s, i) => `${i ? "L" : "M"}${sx(s.year).toFixed(1)},${sy(s.v).toFixed(1)}`).join(" ");
  const fitPath = trendLine.length
    ? `M${sx(trendLine[0].year).toFixed(1)},${sy(trendLine[0].fit).toFixed(1)} L${sx(trendLine[trendLine.length - 1].year).toFixed(1)},${sy(trendLine[trendLine.length - 1].fit).toFixed(1)}`
    : "";
  const gridVals = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * (i + 0.5)) / 4);

  const verdictText =
    p.verdict === "increasing" ? "a statistically significant increasing trend" :
    p.verdict === "decreasing" ? "a statistically significant decreasing trend" :
    p.verdict === "not-significant" ? "no statistically significant monotonic trend" :
    "insufficient data for a reliable assessment";

  return (
    <div className="min-h-screen bg-[#F5F8FC] py-6 text-[#14243A] print:bg-white print:py-0">
      {/* toolbar */}
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link href={`/analysis/${analysis.id}`} className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#64748B] hover:text-[#2563EB]">
          <ArrowLeft size={14} /> Back to analysis
        </Link>
        <PrintButton />
      </div>

      {/* sheet */}
      <article className="report-sheet mx-auto max-w-[210mm] bg-white px-8 py-8 shadow-2xl sm:px-12">
        {/* letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-[3px] border-[#14243A] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="21.5" stroke="#0F9D9A" strokeWidth="2.4" fill="none" />
                <circle cx="24" cy="24" r="10.5" fill="#071426" />
                <path d="M19.2 20.6h9.6l-9.6 6.8h9.6" stroke="#65C7C4" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <div>
                <div className="text-[17px] font-black tracking-[0.06em]">Z9 <span className="text-[#2563EB]">EARTHSCOPE</span></div>
                <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#5f7499]">Earth System Trend Detective</div>
              </div>
            </div>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#5f7499]">Scientific Investigation Report · NASA Space Apps Challenge 2026</p>
          </div>
          <div className="text-right font-mono text-[9px] leading-relaxed text-[#33415c]">
            <div>REPORT ID<br /><span className="text-[10px] font-bold">{analysis.id}</span></div>
            <div className="mt-1.5">ISSUED<br /><span className="font-bold">{new Date(analysis.createdAt).toISOString().replace("T", " ").slice(0, 19)} UTC</span></div>
            <div className="mt-1.5">CHECKSUM (SHA-256)<br /><span className="font-bold">{checksum}</span></div>
          </div>
        </header>

        {/* 01 executive summary */}
        <Section n={1} title="Executive Summary">
          <p>
            This report documents a Z9 EarthScope investigation of <strong>{p.variableName} ({p.variable})</strong> at{" "}
            <strong>{p.locationName}</strong> ({p.latitude.toFixed(4)}°, {p.longitude.toFixed(4)}°) over{" "}
            <strong>{p.startDate} to {p.endDate}</strong> at <strong>{p.resolution}</strong> resolution. The analysis finds{" "}
            <strong>{verdictText}</strong> (α = {p.alpha}). The robust Sen (median pairwise) slope is{" "}
            <strong>{p.senSlopePerDecade >= 0 ? "+" : ""}{fmt(p.senSlopePerDecade, 4)} {p.unit} per decade</strong> across{" "}
            {p.nObs.toLocaleString()} valid observations ({(p.coverage * 100).toFixed(1)}% calendar coverage).
          </p>
          <p className="mt-1.5">
            This is an observational statement about the NASA POWER grid cell containing the coordinates over the selected
            period. It does <strong>not</strong> establish causation, does not extrapolate beyond the observed window, and does not
            describe political regions as a whole.
          </p>
        </Section>

        {/* 02 investigation target */}
        <Section n={2} title="Investigation Target">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <Row k="Variable" v={<>{p.variableName} (<code>{p.variable}</code>) — {p.unit}</>} />
              <Row k="Location" v={<>{p.locationName} · {p.latitude.toFixed(4)}° lat, {p.longitude.toFixed(4)}° lon</>} />
              <Row k="Period" v={<>{p.startDate} → {p.endDate} ({p.resolution} means)</>} />
              <Row k="Significance threshold (α)" v={String(p.alpha)} />
              <Row k="Requested at" v={new Date(p.requestedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC"} />
            </tbody>
          </table>
        </Section>

        {/* 03 dataset & provenance */}
        <Section n={3} title="Dataset & Provenance">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <Row k="Source" v={p.source} />
              <Row k="Community / product" v={p.community} />
              <Row k="Temporal API" v={p.resolution === "daily" ? "temporal/daily/point (v2.10.0)" : "temporal/monthly/point (v2.10.0)"} />
              <Row k="Fill value" v={<>−999 (removed; {p.nMissing} missing slots of {p.nExpected} expected)</>} />
              <Row k="Resolution" v="0.5° × 0.625° global assimilation grid (~55 km)" />
              <Row k="Observations used" v={p.nObs.toLocaleString()} />
              <Row k="Access date (UTC)" v={new Date(p.requestedAt).toISOString().slice(0, 10)} />
            </tbody>
          </table>
        </Section>

        {/* 04 results */}
        <Section n={4} title="Trend Statistics">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Estimator / test</th>
                <th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Result</th>
                <th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <Row k="OLS slope" v={`${fmt(p.slopePerDecade, 4)} ${p.unit}/decade`} />
              <Row k="Sen's slope (robust)" v={`${fmt(p.senSlopePerDecade, 4)} ${p.unit}/decade`} />
              <Row k="95% CI (OLS slope)" v={`${fmt(p.slopeCILower, 4)} → ${fmt(p.slopeCIUpper, 4)} ${p.unit}/decade`} />
              <Row k="R² (OLS)" v={fmt(p.rSquared, 4)} />
              <Row k="OLS slope t / p" v={`t = ${fmt(Math.abs(p.olsTStat), 3)}, p ${fmtP(p.olsPValue)}`} />
              <Row k="Mann–Kendall S / Z" v={`S = ${fmt(p.mkS, 0)}, Z = ${fmt(Math.abs(p.mkZ), 3)}, p ${fmtP(p.mkPValue)}, τ = ${fmt(p.mkTau, 4)}`} />
              <Row k="Seasonal Mann–Kendall" v={p.seasonalMk ? `Z = ${fmt(Math.abs(p.seasonalMk.z), 3)}, p ${fmtP(p.seasonalMk.pValue)} (${p.seasonalMk.groups} calendar-month groups)` : "not applicable (needs ≥ 2 yrs monthly grid)"} />
              <Row k="Primary test" v={p.primaryTest === "seasonal-mann-kendall" ? "Seasonal Mann–Kendall (annual-cycle controlled)" : "Mann–Kendall"} />
              <Row k="Verdict @ α" v={<strong>{p.significant ? "SIGNIFICANT" : "NOT SIGNIFICANT"} — {p.verdict.replace("-", " ")}</strong>} />
            </tbody>
          </table>
        </Section>

        {/* 05 figure */}
        <Section n={5} title="Figure 1 — Observations & Fitted Trend">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-[#d3dceb]" role="img" aria-label="Time series of observations with OLS trend line">
            {gridVals.map((g, i) => (
              <g key={i}>
                <line x1={PL} x2={W - PR} y1={sy(g)} y2={sy(g)} stroke="#d3dceb" strokeDasharray="2 3" strokeWidth="0.6" />
                <text x={PL - 4} y={sy(g) + 3} textAnchor="end" fontSize="8" fill="#5f7499" fontFamily="monospace">{g.toFixed(1)}</text>
              </g>
            ))}
            <path d={obsPath} fill="none" stroke="#1c5d8f" strokeWidth="1" strokeOpacity="0.85" />
            {fitPath && <path d={fitPath} fill="none" stroke="#0d7a6f" strokeWidth="1.6" strokeDasharray="6 4" />}
            <text x={PL} y={H - 6} fontSize="8.5" fill="#33415c" fontFamily="monospace">{Math.floor(x0)}</text>
            <text x={W - PR} y={H - 6} fontSize="8.5" fill="#33415c" fontFamily="monospace" textAnchor="end">{Math.floor(x1)}</text>
            <text x={W - PR} y={12} fontSize="8.5" fill="#0d7a6f" fontFamily="monospace" textAnchor="end">— OLS trend</text>
            <text x={W - PR} y={24} fontSize="8.5" fill="#1c5d8f" fontFamily="monospace" textAnchor="end">— Observations ({p.unit})</text>
          </svg>
          <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5f7499]">Figure 1 — {p.variable} at {p.locationName} · {p.startDate} → {p.endDate} · gaps (−999) excluded</p>
        </Section>

        {/* 06 anomaly diagnostics */}
        <Section n={6} title="Environmental Anomaly Diagnostics">
          <p>
            Anomalies are screened using a same-calendar-month median and median absolute deviation after removing the Sen trend. The diagnostic threshold is |robust z| ≥ {anomalyScan.threshold}; these flags are not disaster classifications.
          </p>
          {anomalyScan.available ? (
            anomalyScan.anomalies.length ? (
              <table className="mt-2 w-full border-collapse text-[11px]">
                <thead><tr><th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Date</th><th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Observed</th><th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Seasonal baseline</th><th className="border border-[#d3dceb] bg-[#060d21] px-3 py-1.5 text-left text-white">Robust z</th></tr></thead>
                <tbody>
                  {anomalyScan.anomalies.slice(0, 8).map((item) => (
                    <tr key={item.t}>
                      <td className="border border-[#d3dceb] px-3 py-1.5 font-mono">{item.t}</td>
                      <td className="border border-[#d3dceb] px-3 py-1.5 font-mono">{fmt(item.value, 3)} {p.unit}</td>
                      <td className="border border-[#d3dceb] px-3 py-1.5 font-mono">{fmt(item.baseline, 3)} {p.unit}</td>
                      <td className="border border-[#d3dceb] px-3 py-1.5 font-mono">{item.robustZ > 0 ? "+" : ""}{fmt(item.robustZ, 2)} (n={item.baselineCount})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="mt-2">No observation crossed the seasonal robust-z threshold in the selected period.</p>
          ) : <p className="mt-2">Insufficient same-season history to calculate a stable anomaly baseline.</p>}
        </Section>

        {/* 07 quality */}
        <Section n={7} title="Data Quality Diagnostics">
          <ul className="list-disc space-y-1 pl-5">
            <li>Valid observations: <strong>{p.nObs.toLocaleString()}</strong> of {p.nExpected.toLocaleString()} expected calendar slots ({(p.coverage * 100).toFixed(1)}% coverage).</li>
            <li>Missing values (−999) removed: {p.nMissing} — no interpolation or imputation was applied.</li>
            <li>IQR outlier diagnostic: {p.nOutliers} observations beyond 1.5×IQR fences (retained in all statistics).</li>
            <li>Residual lag-1 autocorrelation: {p.lag1Autocorr === null ? "n/a" : p.lag1Autocorr.toFixed(3)}{Math.abs(p.lag1Autocorr ?? 0) > 0.4 ? " — exceeds 0.40; p-values may be optimistic" : " — within acceptable range"}.</li>
          </ul>
          {p.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#7a4a00]">
              {p.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </Section>

        {/* 07 methodology */}
        <Section n={8} title="Methodology">
          <p>
            Trend detection follows the Z9 EarthScope statistical protocol: (i) ingest NASA POWER observations server-side with
            fill-value removal; (ii) ordinary least-squares regression for slope, R² and 95% CI; (iii) Theil–Sen median-pairwise
            slope as the robust magnitude estimator; (iv) Mann–Kendall test with tie and continuity corrections; (v) seasonal
            Mann–Kendall (Hirsch &amp; Slack, 1984) grouping by calendar month, reported as primary when applicable; (vi) lag-1
            autocorrelation screening of residuals. Significance is decided strictly against the operator-selected α. Full equations
            and limitations: <span className="font-mono">/data-sources#methodology</span>.
          </p>
        </Section>

        {/* 09 scientific interpretation */}
        <Section n={9} title="Scientific Interpretation">
          <p className="mb-1.5 font-semibold">{reportExplanation.title} · {reportExplanation.mode === "ai-assisted" ? "AI-assisted narrative" : "deterministic engine"}</p>
          {reportExplanation.body.map((paragraph, index) => <p key={index} className={index ? "mt-1.5" : undefined}>{paragraph}</p>)}
          <p className="mt-2"><strong>Potential environmental relevance (context only):</strong> {buildImpactContext(p.variable, p.verdict)}</p>
          <p className="mt-1.5 text-[#64748B]">{reportExplanation.notice}</p>
        </Section>

        {/* 10 limitations */}
        <Section n={10} title="Limitations & Honest Boundaries">
          <ul className="list-disc space-y-1 pl-5">
            {analysis.explanation.limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </Section>

        {/* 11 sources */}
        <Section n={11} title="Sources & Citation">
          <p>
            Data: NASA Langley Research Center — Prediction Of Worldwide Energy Resources (POWER), {p.source}. Accessed via the
            temporal point API on {new Date(p.requestedAt).toISOString().slice(0, 10)}. Parameter <code>{p.variable}</code> ({p.variableName}),
            community {p.community}.
          </p>
          <p className="mt-1.5">
            Suggested citation: NASA/LARC POWER Project (2026). POWER {p.resolution} surface meteorology &amp; flipped fluxes — point API.
            https://power.larc.nasa.gov/. Retrieved {new Date(p.requestedAt).toISOString().slice(0, 10)}.
          </p>
          <p className="mt-1.5 text-[#5f7499]">
            Z9 EarthScope is an independent open-source project by Z9 Space Labs (Islamabad, Pakistan) built for the NASA Space
            Apps Challenge 2026. It is not affiliated with, or endorsed by, NASA. NASA remains the owner of its data, used here
            under NASA’s open data policy.
          </p>
        </Section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#d3dceb] pt-3 font-mono text-[8px] uppercase tracking-[0.2em] text-[#5f7499]">
          <span>Z9 EarthScope · Z9 Space Labs · Islamabad, Pakistan</span>
          <span>Report {analysis.id.slice(0, 8)} · SHA-256 {checksum}</span>
        </footer>
      </article>
    </div>
  );
}
