"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft, Loader2, MapPin, Search, TriangleAlert, Scale, TrendingUp, TrendingDown, Minus, X,
} from "lucide-react";
import { VARIABLES, getVariable, POWER_AVAILABLE_FROM } from "@/lib/variables";
import type { AnalysisResponse } from "./results-dashboard";
import CompareOverlayChart from "./compare-overlay-chart";
import TimeSeriesChart from "./time-series-chart";

const EarthMap = dynamic(() => import("./earth-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-[300px] w-full" />,
});

const TODAY = new Date().toISOString().slice(0, 10);

interface GeoResult { name: string; latitude: number; longitude: number; }

interface LocState { name: string; lat: number; lon: number; }

function LocationPicker({
  label, accent, value, onChange,
}: {
  label: string;
  accent: string;
  value: LocState;
  onChange: (v: LocState) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: GeoResult[] };
        setResults(data.results ?? []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1 border-l-2 border-line bg-transparent p-2 sm:p-3" style={{ borderLeftColor: accent }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em]" style={{ color: accent }}>{label}</span>
        <span className="font-mono text-[0.58rem] tabular-nums text-faint">{value.lat.toFixed(3)}°, {value.lon.toFixed(3)}°</span>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-line-strong bg-abyss px-2.5">
        <Search size={14} className="shrink-0 text-faint" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search city…"
          className="h-9 w-full bg-transparent text-[0.82rem] text-ice outline-none placeholder:text-faint"
          aria-label={`${label} city search`}
        />
        {loading && <Loader2 size={14} className="animate-spin text-cyan" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-line-strong bg-deep/98 shadow-xl backdrop-blur-xl">
          {results.map((g, i) => (
            <button key={i} className="block w-full px-3 py-2 text-left text-[0.8rem] text-ice hover:bg-panel"
              onClick={() => { onChange({ name: g.name, lat: g.latitude, lon: g.longitude }); setQuery(""); setOpen(false); }}>
              {g.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input type="number" step="0.0001" value={value.lat} aria-label="Latitude"
          onChange={(e) => onChange({ ...value, lat: Number(e.target.value) })}
          className="field !py-1.5 font-mono text-[0.78rem] tabular-nums" />
        <input type="number" step="0.0001" value={value.lon} aria-label="Longitude"
          onChange={(e) => onChange({ ...value, lon: Number(e.target.value) })}
          className="field !py-1.5 font-mono text-[0.78rem] tabular-nums" />
      </div>
      <input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} aria-label="Location label"
        className="field mt-2 !py-1.5 text-[0.78rem]" placeholder="Location label" />
    </div>
  );
}

interface Props {
  initialVariable?: string;
  initialA?: LocState;
  initialB?: LocState;
  initialStart?: string;
  initialEnd?: string;
  initialResolution?: "daily" | "monthly";
}

export default function CompareWorkspace({ initialVariable, initialA, initialB, initialStart, initialEnd, initialResolution }: Props) {
  const [variable, setVariable] = useState(() => getVariable(initialVariable ?? "")?.code ?? "T2M");
  const [a, setA] = useState<LocState>(initialA ?? { name: "Islamabad, Pakistan", lat: 33.6844, lon: 73.0479 });
  const [b, setB] = useState<LocState>(initialB ?? { name: "Karachi, Pakistan", lat: 24.8607, lon: 67.0011 });
  const [start, setStart] = useState(initialStart ?? "2000-01-01");
  const [end, setEnd] = useState(initialEnd ?? TODAY);
  const [separatePeriods, setSeparatePeriods] = useState(false);
  const [startA, setStartA] = useState(initialStart ?? "2000-01-01");
  const [endA, setEndA] = useState(initialEnd ?? TODAY);
  const [startB, setStartB] = useState(initialStart ?? "2000-01-01");
  const [endB, setEndB] = useState(initialEnd ?? TODAY);
  const [resolution, setResolution] = useState<"daily" | "monthly">(initialResolution ?? "monthly");
  const [alpha, setAlpha] = useState(0.05);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2 | 3>(0);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ a: AnalysisResponse; b: AnalysisResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const setupDialogRef = useRef<HTMLDialogElement>(null);
  const reportDialogRef = useRef<HTMLDialogElement>(null);

  const variableDef = getVariable(variable)!;

  useEffect(() => {
    const dialog = setupDialogRef.current;
    if (!dialog) return;
    if (setupStep > 0 && !dialog.open) dialog.showModal();
    if (setupStep === 0 && dialog.open) dialog.close();
  }, [setupStep]);

  useEffect(() => {
    const dialog = reportDialogRef.current;
    if (!dialog) return;
    if (reportOpen && !dialog.open) dialog.showModal();
    if (!reportOpen && dialog.open) dialog.close();
  }, [reportOpen]);

  const runCompare = useCallback(async () => {
    setError(null);
    const periodA = separatePeriods ? { start: startA, end: endA } : { start, end };
    const periodB = separatePeriods ? { start: startB, end: endB } : { start, end };
    if (periodA.start > periodA.end || periodB.start > periodB.end) {
      setError("Each start date must be on or before its end date.");
      return;
    }
    setSetupStep(0);
    setRunning(true);
    setResults(null);
    setReportOpen(true);
    const payloadFor = (loc: LocState, period: { start: string; end: string }) => ({
      variable, latitude: loc.lat, longitude: loc.lon, locationName: loc.name,
      startDate: period.start, endDate: period.end, resolution, alpha, persist: false,
    });
    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFor(a, periodA)) }),
        fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFor(b, periodB)) }),
      ]);
      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
      if (!resA.ok) throw new Error(`Location A failed: ${dataA?.error ?? `HTTP ${resA.status}`}`);
      if (!resB.ok) throw new Error(`Location B failed: ${dataB?.error ?? `HTTP ${resB.status}`}`);
      setResults({ a: dataA as AnalysisResponse, b: dataB as AnalysisResponse });
    } catch (err) {
      setError((err as Error).message ?? "Comparison failed.");
    } finally {
      setRunning(false);
    }
  }, [a, b, variable, start, end, startA, endA, startB, endB, separatePeriods, resolution, alpha]);

  const delta = useMemo(() => {
    if (!results) return null;
    const pa = results.a.payload, pb = results.b.payload;
    const dSen = pa.senSlopePerDecade - pb.senSlopePerDecade;
    const dAbs = Math.abs(dSen);
    const unit = pa.unit;
    const faster = dSen >= 0 ? "a" : "b";
    const sigA = pa.significant, sigB = pb.significant;
    return { dSen, dAbs, unit, faster, sigA, sigB };
  }, [results]);

  const rows = useMemo(() => {
    if (!results) return [];
    const pa = results.a.payload, pb = results.b.payload;
    const fmt = (n: number, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : "—");
    const fmtp = (p: number) => (p < 0.0001 ? "<0.0001" : p.toFixed(4));
    return [
      { metric: "Observation period", valA: `${pa.startDate} → ${pa.endDate}`, valB: `${pb.startDate} → ${pb.endDate}`, delta: pa.startDate === pb.startDate && pa.endDate === pb.endDate ? "same window" : "separate windows" },
      { metric: "Valid observations", valA: String(pa.nObs), valB: String(pb.nObs), delta: `${pa.nObs - pb.nObs >= 0 ? "+" : ""}${pa.nObs - pb.nObs}` },
      { metric: "Coverage", valA: `${(pa.coverage * 100).toFixed(1)}%`, valB: `${(pb.coverage * 100).toFixed(1)}%`, delta: `${((pa.coverage - pb.coverage) * 100).toFixed(1)} pp` },
      { metric: `Sen's slope (${pa.unit}/decade)`, valA: fmt(pa.senSlopePerDecade), valB: fmt(pb.senSlopePerDecade), delta: `${delta && delta.dSen >= 0 ? "+" : ""}${fmt(delta?.dSen ?? 0)}` },
      { metric: `OLS slope (${pa.unit}/decade)`, valA: fmt(pa.slopePerDecade), valB: fmt(pb.slopePerDecade), delta: fmt(pa.slopePerDecade - pb.slopePerDecade) },
      { metric: "R² (OLS)", valA: fmt(pa.rSquared), valB: fmt(pb.rSquared), delta: fmt(pa.rSquared - pb.rSquared) },
      { metric: "Seasonal M–K p", valA: pa.seasonalMk ? fmtp(pa.seasonalMk.pValue) : "n/a", valB: pb.seasonalMk ? fmtp(pb.seasonalMk.pValue) : "n/a", delta: "—" },
      { metric: "Primary p-value", valA: fmtp(pa.primaryPValue), valB: fmtp(pb.primaryPValue), delta: "—" },
      { metric: "Trend verdict", valA: pa.verdict.replace("-", " "), valB: pb.verdict.replace("-", " "), delta: "—" },
    ];
  }, [results, delta]);

  const VerdictIcon = ({ v }: { v: string }) =>
    v === "increasing" ? <TrendingUp size={13} className="text-coral" /> :
    v === "decreasing" ? <TrendingDown size={13} className="text-electric" /> : <Minus size={13} className="text-mist" />;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker">Head-to-Head Investigation</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ice sm:text-4xl">Location <span className="text-cyan">Compare</span></h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">Compare one variable across two places and either a shared or separate historical window.</p>
        </div>
        <Link href="/explorer" className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-cyan hover:underline">← Back to Trend Explorer</Link>
      </div>

      {/* map */}
      <div className="panel mt-6 p-3">
        <EarthMap
          height="clamp(380px, 52vh, 520px)"
          fitToLocations
          locations={[
            { name: a.name, latitude: a.lat, longitude: a.lon, color: "#2563EB" },
            { name: b.name, latitude: b.lat, longitude: b.lon, color: "#0F9D9A" },
          ]}
          line={[{ latitude: a.lat, longitude: a.lon }, { latitude: b.lat, longitude: b.lon }]}
        />
      </div>

      {setupStep === 0 ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setSetupStep(1)}
            className="btn btn-primary h-12 w-full max-w-sm justify-center !text-sm shadow-[0_0_28px_rgba(15,157,154,0.24)]"
          >
            <Scale size={18} /> Compare Locations
          </button>
        </div>
      ) : (
        <dialog
          ref={setupDialogRef}
          onCancel={(event) => { event.preventDefault(); setSetupStep(0); }}
          onClick={(event) => { if (event.target === event.currentTarget) setSetupStep(0); }}
          className="m-auto max-h-[calc(100dvh-24px)] w-[min(96vw,768px)] max-w-none overflow-hidden rounded-xl border border-line bg-deep p-0 text-ice shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
          aria-labelledby="compare-setup-title"
        >
        <div className="space-y-3 p-3 sm:space-y-4 sm:p-5" aria-live="polite">
          <header className="flex items-start justify-between gap-4 border-b border-line pb-3 sm:pb-4">
            <div>
              <p className="kicker">Comparison setup · Step {setupStep} of 3</p>
              <h2 id="compare-setup-title" className="mt-1 font-display text-lg font-semibold text-ice">
                {setupStep === 1 ? "Choose locations" : setupStep === 2 ? "Choose a variable" : "Set analysis period"}
              </h2>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((step) => (
                  <span key={step} className={`h-1 w-8 rounded-full ${step <= setupStep ? "bg-cyan" : "bg-line-strong"}`} />
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setSetupStep(0)} className="btn btn-ghost h-9 w-9 shrink-0 !min-h-0 !p-0" aria-label="Close comparison setup" title="Close setup">
              <X size={17} />
            </button>
          </header>

          {setupStep === 1 && (
            <section className="panel flex flex-col gap-2 p-3 sm:gap-3 sm:p-5" aria-label="Choose comparison locations">
              <div className="flex flex-col gap-2 md:flex-row sm:gap-3">
                <LocationPicker label="Location A" accent="#2563EB" value={a} onChange={setA} />
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => { setA(b); setB(a); }}
                    className="btn btn-ghost h-10 w-10 !min-h-0 !p-0"
                    title="Swap locations" aria-label="Swap locations"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                </div>
                <LocationPicker label="Location B" accent="#0F9D9A" value={b} onChange={setB} />
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setSetupStep(0)} className="btn btn-ghost">Back to map</button>
                <button type="button" onClick={() => setSetupStep(2)} className="btn btn-primary">Next: variable</button>
              </div>
            </section>
          )}

          {setupStep === 2 && (
            <section className="panel flex flex-col gap-2 p-3 sm:gap-3 sm:p-5" aria-label="Choose environmental variable">
              <span className="label">Environmental variable</span>
              <select value={variable} onChange={(e) => setVariable(e.target.value)} className="field" aria-label="Variable">
                {VARIABLES.map((v) => <option key={v.code} value={v.code}>{v.name} ({v.code}) — {v.unit}</option>)}
              </select>
              <p className="text-[0.7rem] leading-snug text-faint">{variableDef.description}</p>
              <div className="flex justify-between gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setSetupStep(1)} className="btn btn-ghost">Back</button>
                <button type="button" onClick={() => setSetupStep(3)} className="btn btn-primary">Next: analysis period</button>
              </div>
            </section>
          )}

          {setupStep === 3 && (
            <section className="panel flex flex-col gap-2 p-3 sm:gap-3 sm:p-5" aria-label="Set comparison period and analysis options">
              <span className="label">Period &amp; rigour</span>
              {separatePeriods ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { label: `Location A · ${a.name}`, start: startA, end: endA, setStart: setStartA, setEnd: setEndA },
                    { label: `Location B · ${b.name}`, start: startB, end: endB, setStart: setStartB, setEnd: setEndB },
                  ] as const).map((period, index) => (
                    <fieldset key={index} className="min-w-0 space-y-2 border-t border-line pt-2">
                      <legend className="max-w-full truncate font-mono text-[0.55rem] uppercase tracking-[0.12em] text-faint">{period.label}</legend>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" min={POWER_AVAILABLE_FROM} max={TODAY} value={period.start} onChange={(e) => period.setStart(e.target.value)} className="field !px-2 !py-2 font-mono text-[0.72rem]" aria-label={`Location ${index === 0 ? "A" : "B"} start date`} />
                        <input type="date" min={POWER_AVAILABLE_FROM} max={TODAY} value={period.end} onChange={(e) => period.setEnd(e.target.value)} className="field !px-2 !py-2 font-mono text-[0.72rem]" aria-label={`Location ${index === 0 ? "A" : "B"} end date`} />
                      </div>
                    </fieldset>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" min={POWER_AVAILABLE_FROM} max={TODAY} value={start} onChange={(e) => setStart(e.target.value)} className="field !px-2 !py-2 font-mono text-[0.72rem]" aria-label="Start date" />
                  <input type="date" min={POWER_AVAILABLE_FROM} max={TODAY} value={end} onChange={(e) => setEnd(e.target.value)} className="field !px-2 !py-2 font-mono text-[0.72rem]" aria-label="End date" />
                </div>
              )}
              <label className="flex min-h-9 items-center gap-2 text-sm text-mist">
                <input type="checkbox" checked={separatePeriods} onChange={(event) => setSeparatePeriods(event.target.checked)} className="accent-cyan" />
                Compare separate historical periods
              </label>
              <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-2">
                <div className="min-w-0">
                  <span className="label mb-1 block !text-[0.52rem] !tracking-[0.12em]">Resolution</span>
                  <div className="grid grid-cols-2 gap-1" role="group" aria-label="Data resolution">
                    {(["monthly", "daily"] as const).map((r) => (
                      <button key={r} type="button" onClick={() => setResolution(r)}
                        className={`rounded-md border px-2 py-1.5 font-display text-[0.68rem] font-bold capitalize transition-all ${resolution === r ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-mist"}`}
                        aria-pressed={resolution === r}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="label mb-1 block !text-[0.52rem] !tracking-[0.12em]">Significance α</span>
                  <div className="flex gap-1" role="group" aria-label="Significance level">
                    {[0.01, 0.05, 0.1].map((v) => (
                      <button key={v} type="button" onClick={() => setAlpha(v)}
                        className={`min-w-0 flex-1 rounded-md border px-1.5 py-1.5 font-mono text-[0.62rem] ${alpha === v ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-line text-mist"}`}
                        aria-pressed={alpha === v}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-[0.74rem] text-[#ffc5bc]">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
              <button type="button" onClick={runCompare} disabled={running} className="btn btn-primary h-10 w-full justify-center !text-[0.74rem]">
                {running ? <Loader2 size={17} className="animate-spin" /> : <Scale size={17} />}
                {running ? "COMPARING…" : "RUN COMPARISON"}
              </button>
              <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => setSetupStep(2)} className="btn btn-ghost">Back</button>
                <p className="text-right font-mono text-[0.5rem] uppercase tracking-[0.14em] leading-tight text-faint">Two live NASA POWER point requests · not cached</p>
              </div>
            </section>
          )}
        </div>
        </dialog>
      )}

      <dialog
        ref={reportDialogRef}
        onCancel={(event) => { event.preventDefault(); setReportOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) setReportOpen(false); }}
        className="m-auto max-h-[92dvh] w-[min(96vw,1440px)] max-w-none overflow-hidden rounded-xl border border-line bg-deep p-0 text-ice shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
        aria-labelledby="compare-report-title"
        aria-busy={running}
      >
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-deep px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="kicker">Z9 EarthScope · Comparison output</p>
              <h2 id="compare-report-title" className="mt-1 font-display text-xl font-bold text-ice sm:text-2xl">Comparison report</h2>
              <p className="mt-1 truncate text-sm text-mist">{a.name} <span className="text-faint">vs</span> {b.name} · {variableDef.name}</p>
            </div>
            <button type="button" onClick={() => setReportOpen(false)} className="btn btn-ghost h-9 w-9 shrink-0 !min-h-0 !p-0" aria-label="Close comparison report" title="Close report">
              <X size={17} />
            </button>
          </header>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {running && !results && (
              <div className="mx-auto max-w-xl py-8 sm:py-12" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
                    <Loader2 size={21} className="animate-spin" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ice">Retrieving comparison data</h3>
                    <p className="text-sm text-mist">Both NASA POWER requests are running in parallel.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[{ label: "Location A", name: a.name }, { label: "Location B", name: b.name }].map((location) => (
                    <div key={location.label} className="panel-flat flex items-center gap-3 p-4">
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-cyan" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">{location.label}</p>
                        <p className="truncate text-sm font-medium text-ice">{location.name}</p>
                      </div>
                      <span className="ml-auto text-xs text-mist">Loading</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-faint">The summary and charts will appear here when both location series are ready.</p>
              </div>
            )}

            {error && !running && (
              <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-10" role="alert">
                <div className="flex items-start gap-3 rounded-lg border border-coral/40 bg-coral/10 p-4 text-[#ffc5bc]">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold">Comparison could not be completed</h3>
                    <p className="mt-1 text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
                <button type="button" onClick={runCompare} className="btn btn-primary">Try again</button>
              </div>
            )}

            {results && delta && (
              <div className="mx-auto max-w-[1320px] space-y-6">
                {(results.a.demo || results.b.demo) && (
                  <div className="rounded-lg border border-amber/50 bg-amber/10 px-4 py-3 text-sm text-amber" role="note">One or both responses used synthetic demo data. Interpret results with caution.</div>
                )}

                <section aria-labelledby="compare-summary-heading">
                  <div className="mb-3">
                    <p className="label">At a glance</p>
                    <h3 id="compare-summary-heading" className="mt-1 font-display text-lg font-semibold text-ice">Key findings</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="panel-flat p-4">
                      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">Trend gap · A − B</p>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-cyan">{delta.dSen >= 0 ? "+" : ""}{delta.dSen.toFixed(3)} <span className="text-sm font-medium">{delta.unit}/decade</span></p>
                      <p className="mt-1 text-sm leading-relaxed text-mist">{delta.dSen >= 0 ? "A" : "B"} has the steeper Sen trend.</p>
                    </div>
                    <div className="panel-flat p-4">
                      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">Significance · α = {alpha}</p>
                      <p className="mt-2 text-sm font-semibold text-ice">A: {delta.sigA ? "Significant" : "Not significant"}</p>
                      <p className="text-sm font-semibold text-ice">B: {delta.sigB ? "Significant" : "Not significant"}</p>
                      <p className="mt-1 text-xs leading-relaxed text-mist">{delta.sigA === delta.sigB ? "Both locations agree in significance class." : "The locations differ at this threshold."}</p>
                    </div>
                    <div className="panel-flat p-4">
                      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">Data coverage</p>
                      <p className="mt-1 font-display text-2xl font-bold text-ice">{Math.min(results.a.payload.coverage, results.b.payload.coverage) >= 0.95 ? "Comparable" : "Check gaps"}</p>
                      <p className="mt-1 text-sm leading-relaxed text-mist">A {(results.a.payload.coverage * 100).toFixed(1)}% · B {(results.b.payload.coverage * 100).toFixed(1)}% coverage.</p>
                    </div>
                  </div>
                </section>

                <section aria-labelledby="compare-trends-heading">
                  <div className="mb-3">
                    <p className="label">Visual analysis</p>
                    <h3 id="compare-trends-heading" className="mt-1 font-display text-lg font-semibold text-ice">Trend charts</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="panel p-4 sm:p-5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="font-display text-sm font-semibold text-ice">Annual-mean overlay</h4>
                        <span className="chip">{variableDef.unit}</span>
                      </div>
                      <CompareOverlayChart
                        a={{ name: "A · " + a.name.split(",")[0], color: "#2563EB", series: results.a.series }}
                        b={{ name: "B · " + b.name.split(",")[0], color: "#0F9D9A", series: results.b.series }}
                        unit={variableDef.unit}
                      />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {([["a", results.a] as const, ["b", results.b] as const]).map(([key, res]) => (
                        <div key={key} className="panel min-w-0 p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h4 className="flex min-w-0 items-center gap-2 font-display text-sm font-semibold text-ice">
                              <VerdictIcon v={res.payload.verdict} />
                              <span className="truncate">{key === "a" ? "A · " : "B · "}{res.payload.locationName}</span>
                            </h4>
                            <span className={`tag shrink-0 font-mono ${res.payload.significant ? "!border-cyan/40 !text-cyan" : ""}`}>
                              p {res.payload.primaryPValue < 0.0001 ? "<0.0001" : `=${res.payload.primaryPValue.toFixed(4)}`}
                            </span>
                          </div>
                          <TimeSeriesChart
                            series={res.series}
                            slopePerYear={res.payload.slopePerYear}
                            intercept={res.payload.intercept}
                            unit={res.payload.unit}
                            color={key === "a" ? "#2563EB" : "#0F9D9A"}
                            height={220}
                            showBrush={false}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="panel overflow-hidden" aria-labelledby="compare-ledger-heading">
                  <div className="border-b border-line p-4">
                    <p className="label">Reference data</p>
                    <h3 id="compare-ledger-heading" className="mt-1 font-display text-base font-semibold text-ice">Comparison metrics</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                      <thead className="bg-white/[0.025] text-xs text-mist">
                        <tr>
                          <th className="w-[27%] px-4 py-3 font-semibold">Metric</th>
                          <th className="w-[25%] px-4 py-3 font-semibold">A · {a.name.split(",")[0]}</th>
                          <th className="w-[25%] px-4 py-3 font-semibold">B · {b.name.split(",")[0]}</th>
                          <th className="w-[23%] px-4 py-3 font-semibold">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.metric} className="border-t border-line align-top">
                            <th scope="row" className="px-4 py-3 font-medium text-mist">{row.metric}</th>
                            <td className="break-words px-4 py-3 font-mono tabular-nums text-ice">{row.valA}</td>
                            <td className="break-words px-4 py-3 font-mono tabular-nums text-ice">{row.valB}</td>
                            <td className="break-words px-4 py-3 font-mono tabular-nums text-ice">{row.delta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <details className="border-t border-line pt-4 text-sm text-mist">
                  <summary className="cursor-pointer font-medium text-ice">Interpretation note</summary>
                  <p className="mt-2 max-w-4xl leading-relaxed">Both series derive from the same NASA POWER assimilated grid product, so units, calibration and biases are mutually consistent. A point estimate does not describe a whole country. Statistical significance describes trend relative to noise, not causation.</p>
                </details>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
