"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, FileDown, FileText, FlaskConical, MapPin,
  CalendarRange, Database, TriangleAlert, ShieldCheck, ShieldQuestion, CircleAlert,
  Thermometer, Waves, Wind, Sun, Droplets, Gauge,
} from "lucide-react";
import type { StoredAnalysisPayload, StoredSeriesPoint } from "@/db/schema";
import type { ExplanationResult } from "@/lib/explain";
import TimeSeriesChart from "./time-series-chart";
import EnvironmentalInsights from "./environmental-insights";
import RelationshipAnalyzer from "./relationship-analyzer";
import EarthIntelligenceAsk from "./earth-intelligence-ask";
import { getVariable } from "@/lib/variables";

export interface AnalysisResponse {
  id: string | null;
  payload: StoredAnalysisPayload;
  series: StoredSeriesPoint[];
  trendLine: { year: number; fit: number }[];
  explanation: ExplanationResult;
  demo: boolean;
  temporalApi?: string;
  createdAt?: string;
}

const VAR_ICONS: Record<string, typeof Thermometer> = {
  T2M: Thermometer, T2M_MAX: Thermometer, T2M_MIN: Thermometer,
  PRECTOTCORR: Droplets, RH2M: Waves, WS2M: Wind, ALLSKY_SFC_SW_DWN: Sun,
};

const RESULT_THEMES: Record<string, { label: string; detail: string; Icon: typeof Thermometer }> = {
  T2M: { label: "Thermal Field Report", detail: "Mean near-surface air temperature", Icon: Thermometer },
  T2M_MAX: { label: "Heat Extremes Report", detail: "Mean of daily maximum temperatures", Icon: Thermometer },
  T2M_MIN: { label: "Cold Extremes Report", detail: "Mean of daily minimum temperatures", Icon: Thermometer },
  PRECTOTCORR: { label: "Hydrology Field Report", detail: "Bias-corrected precipitation", Icon: Droplets },
  RH2M: { label: "Atmosphere Field Report", detail: "Near-surface relative humidity", Icon: Waves },
  WS2M: { label: "Wind Field Report", detail: "Near-surface wind speed", Icon: Wind },
  ALLSKY_SFC_SW_DWN: { label: "Radiation Field Report", detail: "All-sky surface shortwave energy", Icon: Sun },
};

const ThematicMap = dynamic(() => import("./earth-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

function verdictMeta(v: StoredAnalysisPayload["verdict"]) {
  switch (v) {
    case "increasing":
      return { label: "Increasing trend", tone: "text-coral border-coral/40 bg-coral/10", Icon: TrendingUp };
    case "decreasing":
      return { label: "Decreasing trend", tone: "text-electric border-electric/40 bg-electric/10", Icon: TrendingDown };
    case "not-significant":
      return { label: "No significant monotonic trend", tone: "text-mist border-line-strong bg-panel", Icon: Minus };
    case "insufficient":
      return { label: "Insufficient data", tone: "text-amber border-amber/40 bg-amber/10", Icon: ShieldQuestion };
  }
}

function fmtP(p: number): string {
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}
function fmtNum(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function StatCell({ label, value, sub, mono = true, accent = false }: { label: string; value: string; sub?: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-deep/80 px-3 py-2.5">
      <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-faint">{label}</div>
      <div className={`mt-1 text-[1.02rem] leading-tight ${mono ? "font-mono tabular-nums" : "font-display font-semibold"} ${accent ? "text-cyan" : "text-ice"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[0.62rem] leading-snug text-faint">{sub}</div>}
    </div>
  );
}

export default function ResultsDashboard({ result }: { result: AnalysisResponse }) {
  const { payload: p, series, explanation } = result;
  const variableDef = getVariable(p.variable);
  const VarIcon = VAR_ICONS[p.variable] ?? Gauge;
  const theme = RESULT_THEMES[p.variable] ?? { label: "Earth System Field Report", detail: p.variableName, Icon: Gauge };
  const ThemeIcon = theme.Icon;
  const themeColor = variableDef?.color ?? "#0F9D9A";
  const vm = verdictMeta(p.verdict);

  const csvUrl = useMemo(() => {
    const header = [
      `# Z9 EarthScope — ${p.variableName} (${p.variable})`,
      `# Location: ${p.locationName} (${p.latitude}, ${p.longitude})`,
      `# Period: ${p.startDate} to ${p.endDate} — ${p.resolution} resolution`,
      `# Source: ${p.source}`,
      `# Unit: ${p.unit} | Fill value ${p.fillValue} removed | alpha = ${p.alpha}`,
      `# Exported: ${new Date().toISOString()}`,
      `date,value_${p.variable},unit`,
    ];
    const rows = series.map((s) => `${s.t},${s.v},${p.unit}`);
    return `data:text/csv;charset=utf-8,${encodeURIComponent([...header, ...rows].join("\n"))}`;
  }, [p, series]);

  const csvName = `z9-earthscope_${p.variable}_${p.latitude.toFixed(2)}_${p.longitude.toFixed(2)}_${p.startDate}_${p.endDate}.csv`;

  return (
    <section className="space-y-5" aria-label="Analysis results">
      <div className="relative isolate min-h-[260px] overflow-hidden rounded-lg border border-line-strong bg-abyss" style={{ borderColor: `${themeColor}66` }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-95">
          <ThematicMap
            height="100%"
            initialCenter={[p.latitude, p.longitude]}
            initialZoom={4}
            locations={[{ name: p.locationName, latitude: p.latitude, longitude: p.longitude, color: themeColor, detail: `${p.variable} · ${p.unit}` }]}
            interactive={false}
          />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-abyss/85 via-abyss/55 to-abyss/12" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]" style={{ background: `radial-gradient(ellipse at 82% 48%, ${themeColor}24, transparent 54%)` }} />
        <div className="relative z-10 grid min-h-[260px] gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-ice" style={{ borderColor: `${themeColor}70`, backgroundColor: `${themeColor}18` }}>
              <ThemeIcon size={13} style={{ color: themeColor }} /> {theme.label} · {result.demo ? "Synthetic demo" : "NASA POWER"}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-ice sm:text-4xl">{p.locationName}</h2>
            <p className="mt-2 font-display text-base font-semibold" style={{ color: themeColor }}>{theme.detail}</p>
            <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-mist">
              {p.variable} · {p.startDate} → {p.endDate} · {p.resolution} · {p.latitude.toFixed(3)}°, {p.longitude.toFixed(3)}°
            </p>
            <p className="mt-4 inline-flex items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.17em] text-faint">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} /> NASA Blue Marble · selected analysis grid cell
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-white/15 pt-4 md:min-w-56 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${vm.tone}`}><vm.Icon size={21} /></span>
            <div className="min-w-0">
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.17em] text-mist">Trend finding</p>
              <p className="mt-0.5 font-display text-sm font-bold text-ice">{vm.label}</p>
              <p className="mt-1 font-mono text-[0.7rem] font-semibold tabular-nums" style={{ color: themeColor }}>
                {p.senSlopePerDecade >= 0 ? "+" : ""}{fmtNum(p.senSlopePerDecade)} {p.unit}/decade
              </p>
              <p className="mt-1 font-mono text-[0.53rem] text-faint">{p.primaryTest === "seasonal-mann-kendall" ? "Seasonal M–K" : "Mann–Kendall"} · p {p.primaryPValue < 0.0001 ? "< 0.0001" : `= ${fmtP(p.primaryPValue)}`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* provenance banner */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${result.demo ? "border-amber/50 bg-amber/10" : "border-cyan/25 bg-cyan/5"}`}>
        <div className="flex flex-wrap items-center gap-3 text-[0.72rem]">
          <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-cyan">
            <Database size={13} /> {result.demo ? "Demo mode — synthetic data" : "Live NASA POWER data"}
          </span>
          <span className="hidden text-faint sm:inline">·</span>
          <span className="hidden text-mist md:inline">{result.temporalApi ?? p.source}</span>
          <span className="hidden text-faint lg:inline">·</span>
          <span className="hidden font-mono text-[0.62rem] text-faint lg:inline">community={p.community} · fill={p.fillValue} removed · fetched {new Date(p.requestedAt).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={csvUrl} download={csvName} className="btn btn-ghost !px-3 !py-1.5 !text-[0.65rem]" title="Download timestamped observations as CSV">
            <FileDown size={13} /> CSV
          </a>
          {result.id && (
            <Link href={`/analysis/${result.id}/report`} target="_blank" className="btn btn-ghost !px-3 !py-1.5 !text-[0.65rem]" title="Open print-ready scientific report">
              <FileText size={13} /> Report
            </Link>
          )}
        </div>
      </div>

      {result.demo && (
        <div className="flex items-start gap-3 rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-[0.8rem] leading-relaxed text-amber">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <p><strong>SYNTHETIC DEMONSTRATION DATA.</strong> The live NASA POWER API could not be reached or the demo path was explicitly selected. Every statistic below is computed honestly from this synthetic series — but nothing here describes a real place. Re-run in live mode for real NASA observations.</p>
        </div>
      )}

      {/* indicator cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="panel-flat col-span-2 flex items-center gap-3 p-3 md:col-span-1 md:flex-col md:items-start md:justify-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-panel text-cyan"><VarIcon size={20} /></span>
          <div className="min-w-0">
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-faint">Variable</div>
            <div className="truncate font-display text-sm font-semibold text-ice">{p.variableName}</div>
            <div className="font-mono text-[0.6rem] text-faint">{p.variable} · {p.unit}</div>
          </div>
        </div>

        <div className="panel-flat p-3">
          <MapPin size={15} className="text-cyan" />
          <div className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-faint">Location</div>
          <div className="truncate font-display text-[0.82rem] font-semibold leading-snug text-ice" title={p.locationName}>{p.locationName}</div>
          <div className="font-mono text-[0.6rem] tabular-nums text-faint">{p.latitude.toFixed(3)}°, {p.longitude.toFixed(3)}°</div>
        </div>

        <div className="panel-flat p-3">
          <CalendarRange size={15} className="text-cyan" />
          <div className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-faint">Observation Period</div>
          <div className="font-mono text-[0.72rem] tabular-nums leading-snug text-ice">{p.startDate}<br />→ {p.endDate}</div>
          <div className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-faint">{p.resolution} resolution</div>
        </div>

        <div className="panel-flat p-3">
          <Database size={15} className="text-cyan" />
          <div className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-faint">Valid Observations</div>
          <div className="font-display text-xl font-bold tabular-nums text-ice">{p.nObs.toLocaleString()}</div>
          <div className="font-mono text-[0.58rem] text-faint">{(p.coverage * 100).toFixed(1)}% coverage · {p.nMissing} missing</div>
        </div>

        <div className={`panel-flat col-span-2 flex items-center gap-3 border p-3 md:col-span-1 ${vm.tone}`}>
          <vm.Icon size={26} strokeWidth={2.2} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] opacity-70">Trend Direction</div>
            <div className="font-display text-[0.86rem] font-bold leading-tight">{vm.label}</div>
            <div className="font-mono text-[0.66rem] tabular-nums opacity-90">
              {p.senSlopePerDecade >= 0 ? "+" : ""}{fmtNum(p.senSlopePerDecade)} {p.unit}/decade
            </div>
          </div>
        </div>
      </div>

      {/* significance verdict strip */}
      <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${p.significant ? "border-cyan/35 bg-cyan/[0.07]" : "border-line-strong bg-panel/40"}`}>
        <div className="flex items-center gap-3">
          {p.significant ? <ShieldCheck size={26} className="shrink-0 text-cyan" /> : <ShieldQuestion size={26} className="shrink-0 text-mist" />}
          <div>
            <div className="font-display text-[0.95rem] font-bold tracking-wide text-ice">
              {p.significant ? "STATISTICALLY SIGNIFICANT TREND" : "NOT STATISTICALLY SIGNIFICANT"}
              <span className="ml-2 font-mono text-[0.62rem] font-medium text-faint">α = {p.alpha}</span>
            </div>
            <p className="text-[0.7rem] text-mist">
              Primary test: {p.primaryTest === "seasonal-mann-kendall" ? "Seasonal Mann–Kendall" : "Mann–Kendall"} · {fmtP(p.primaryPValue) === "< 0.0001" ? "p < 0.0001" : `p = ${fmtP(p.primaryPValue)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[0.62rem] text-faint">
          <span>SEN′S SLOPE <b className="text-ice">{fmtNum(p.senSlopePerYear, 4)} {p.unit}/yr</b></span>
          <span className="hidden sm:inline">R² <b className="text-ice">{fmtNum(p.rSquared)}</b></span>
        </div>
      </div>

      {/* chart panel */}
      <div className="panel p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wide text-ice">Historical Observations &amp; Fitted Trend</h3>
            <p className="text-[0.68rem] text-faint">Missing periods (fill −999) are excluded, never interpolated. Drag the brush to isolate a window.</p>
          </div>
          <span className="chip">{p.unit}</span>
        </div>
        <TimeSeriesChart
          series={series}
          slopePerYear={p.slopePerYear}
          intercept={p.intercept}
          unit={p.unit}
          color={variableDef?.color ?? "#5b9dff"}
          height={360}
        />
      </div>

      {/* statistical analysis panel */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="panel p-4 sm:p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-ice">
              <FlaskConical size={15} className="text-cyan" /> Statistical Analysis
            </h3>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-faint">{p.computedBy}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatCell label="OLS slope" value={`${p.slopePerDecade >= 0 ? "+" : ""}${fmtNum(p.slopePerDecade)}`} sub={`${p.unit} / decade`} accent />
            <StatCell label="Sen's slope" value={`${p.senSlopePerDecade >= 0 ? "+" : ""}${fmtNum(p.senSlopePerDecade)}`} sub={`${p.unit} / decade (robust)`} accent />
            <StatCell label="95% CI (slope)" value={`${fmtNum(p.slopeCILower, 2)} → ${fmtNum(p.slopeCIUpper, 2)}`} sub={`${p.unit} / decade`} />
            <StatCell label="R²" value={fmtNum(p.rSquared)} sub="OLS goodness of fit" />
            <StatCell label="OLS slope p-value" value={fmtP(p.olsPValue)} sub={`t(${Math.max(p.nObs - 2, 1)}) = ${fmtNum(p.olsTStat, 2)}`} />
            <StatCell label="Slope σ (std err)" value={fmtNum(p.slopeStdErrPerYear, 4)} sub={`${p.unit} / year`} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatCell label="Mann–Kendall S" value={fmtNum(p.mkS, 0)} sub="unadjusted test statistic" />
            <StatCell label="Mann–Kendall Z" value={fmtNum(Math.abs(p.mkZ), 3)} sub={`${fmtP(p.mkPValue) === "< 0.0001" ? "p < 0.0001" : `p = ${fmtP(p.mkPValue)}`} · τ = ${fmtNum(p.mkTau, 3)}`} />
            <StatCell
              label="Seasonal M–K"
              value={p.seasonalMk ? fmtNum(Math.abs(p.seasonalMk.z), 3) : "n/a"}
              sub={p.seasonalMk ? `${p.seasonalMk.groups} calendar-month groups · ${fmtP(p.seasonalMk.pValue) === "< 0.0001" ? "p < 0.0001" : `p = ${fmtP(p.seasonalMk.pValue)}`}` : "needs ≥ 2 yrs monthly grid"}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="data-table">
              <thead>
                <tr><th>Method</th><th>Estimate</th><th>Verdict @ α = {p.alpha}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mann–Kendall (unadjusted)</td>
                  <td className="font-mono tabular-nums">Z = {fmtNum(Math.abs(p.mkZ), 2)}, {fmtP(p.mkPValue) === "< 0.0001" ? "p < 0.0001" : `p = ${fmtP(p.mkPValue)}`}</td>
                  <td>{p.mkPValue <= p.alpha ? "significant" : "not significant"}</td>
                </tr>
                <tr>
                  <td>Seasonal Mann–Kendall</td>
                  <td className="font-mono tabular-nums">{p.seasonalMk ? `Z = ${fmtNum(Math.abs(p.seasonalMk.z), 2)}, ${p.seasonalMk.pValue < 0.0001 ? "p < 0.0001" : `p = ${p.seasonalMk.pValue.toFixed(4)}`}` : "not applicable"}</td>
                  <td>{p.seasonalMk ? (p.seasonalMk.pValue <= p.alpha ? "significant" : "not significant") : "—"}</td>
                </tr>
                <tr>
                  <td>OLS t-test (slope ≠ 0)</td>
                  <td className="font-mono tabular-nums">t = {fmtNum(Math.abs(p.olsTStat), 2)}, {p.olsPValue < 0.0001 ? "p < 0.0001" : `p = ${p.olsPValue.toFixed(4)}`}</td>
                  <td>{p.olsPValue <= p.alpha ? "significant" : "not significant"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {p.warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber/35 bg-amber/[0.07] p-3">
              <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-amber">
                <TriangleAlert size={13} /> Assumption &amp; quality warnings
              </div>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.74rem] leading-snug text-[#ffe3ad]">
                {p.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* explanation panel */}
        <div className="panel flex flex-col p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold tracking-wide text-ice">Z9 Earth Intelligence</h3>
            <span className="tag">{explanation.mode === "ai-assisted" ? "AI-assisted narrative" : "Deterministic interpretation"}</span>
          </div>
          <div className="mt-3 space-y-3 text-[0.82rem] leading-relaxed text-mist">
            {explanation.body.map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-faint">Limitations &amp; honest boundaries</div>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.73rem] leading-snug text-mist">
              {explanation.limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
          <p className="mt-auto pt-4 text-[0.62rem] leading-snug text-faint">{explanation.notice}</p>
        </div>
      </div>

      <EnvironmentalInsights payload={p} series={series} />
      {result.demo ? (
        <p className="rounded-md border border-amber/35 bg-amber/8 px-4 py-3 text-sm text-amber">
          Variable relationship analysis is disabled for synthetic demo series. Run a live NASA POWER analysis to compare observed variables.
        </p>
      ) : (
        <RelationshipAnalyzer
          variable={p.variable}
          latitude={p.latitude}
          longitude={p.longitude}
          locationName={p.locationName}
          startDate={p.startDate}
          endDate={p.endDate}
          resolution={p.resolution}
        />
      )}
      <EarthIntelligenceAsk analysisId={result.id} />
    </section>
  );
}
