"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Rocket, Search, MapPin, ChevronDown, Check, Loader2, Satellite, X,
  TriangleAlert, Compass, ArrowRightLeft, CircleAlert, CalendarClock, RefreshCw,
} from "lucide-react";
import { VARIABLES, getVariable, CATEGORIES, POWER_AVAILABLE_FROM } from "@/lib/variables";
import { CITY_EXAMPLES } from "@/lib/variables";
import type { AnalysisResponse } from "./results-dashboard";
import ResultsDashboard from "./results-dashboard";

const EarthMap = dynamic(() => import("./earth-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-[300px] w-full" />,
});

interface Props {
  initialVariable?: string;
  initialLat?: number;
  initialLon?: number;
  initialName?: string;
  initialStart?: string;
  initialEnd?: string;
  initialResolution?: string;
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

interface LatestObservation {
  date: string;
  value: number;
  unit: string;
  longName: string;
  source: string;
  unavailable?: boolean;
  error?: string;
}

interface CompletedRun {
  sequence: number;
  result: AnalysisResponse;
}

const TODAY = new Date().toISOString().slice(0, 10);
const STAGES = [
  { at: 0, label: "Validating request & coordinates" },
  { at: 1.2, label: "Contacting NASA POWER (temporal point API)" },
  { at: 6, label: "Receiving observations · removing fill values (−999)" },
  { at: 11, label: "Computing OLS · Sen's slope · Mann–Kendall · seasonal MK" },
  { at: 16, label: "Rendering results & building scientific summary" },
];

export default function ExplorerWorkspace({
  initialVariable, initialLat, initialLon, initialName, initialStart, initialEnd, initialResolution,
}: Props) {
  const [variable, setVariable] = useState(() => getVariable(initialVariable ?? "")?.code ?? "T2M");
  const [varQuery, setVarQuery] = useState("");
  const [varOpen, setVarOpen] = useState(false);
  const [locationName, setLocationName] = useState(initialName ?? "Islamabad, Pakistan");
  const [lat, setLat] = useState(initialLat ?? 33.6844);
  const [lon, setLon] = useState(initialLon ?? 73.0479);
  const [startDate, setStartDate] = useState(initialStart ?? "2000-01-01");
  const [endDate, setEndDate] = useState(initialEnd ?? TODAY);
  const [resolution, setResolution] = useState<"daily" | "monthly">(initialResolution === "daily" ? "daily" : "monthly");
  const [alpha, setAlpha] = useState(0.05);
  const [persist, setPersist] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoResultsQuery, setGeoResultsQuery] = useState("");
  const [geoLoadingQuery, setGeoLoadingQuery] = useState("");
  const [geoOpen, setGeoOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completedRuns, setCompletedRuns] = useState<CompletedRun[]>([]);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [latestObservation, setLatestObservation] = useState<LatestObservation | null>(null);
  const [latestState, setLatestState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [latestRefresh, setLatestRefresh] = useState(0);

  const runSequence = useRef(0);
  const geoRequestSequence = useRef(0);
  const varPanelRef = useRef<HTMLDivElement>(null);
  const geoPanelRef = useRef<HTMLDivElement>(null);
  const setupDialogRef = useRef<HTMLDialogElement>(null);
  const detailsDialogRef = useRef<HTMLDialogElement>(null);

  const selectedVar = getVariable(variable)!;
  const geoSearchTerm = geoQuery.trim();
  const geoSuggestions = geoResultsQuery === geoSearchTerm ? geoResults : [];
  const geoLoading = geoSearchTerm.length >= 2 && geoLoadingQuery === geoSearchTerm;

  // ---------- click-outside for dropdowns
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (varPanelRef.current && !varPanelRef.current.contains(e.target as Node)) setVarOpen(false);
      if (geoPanelRef.current && !geoPanelRef.current.contains(e.target as Node)) setGeoOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ---------- debounced geocoder
  useEffect(() => {
    const q = geoSearchTerm;
    if (q.length < 2) return;
    const requestSequence = ++geoRequestSequence.current;
    const id = setTimeout(async () => {
      setGeoLoadingQuery(q);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: GeoResult[] };
        if (requestSequence !== geoRequestSequence.current) return;
        setGeoResults(data.results ?? []);
        setGeoResultsQuery(q);
      } catch {
        if (requestSequence !== geoRequestSequence.current) return;
        setGeoResults([]);
        setGeoResultsQuery(q);
      } finally {
        if (requestSequence === geoRequestSequence.current) setGeoLoadingQuery("");
      }
    }, 320);
    return () => {
      clearTimeout(id);
      geoRequestSequence.current += 1;
    };
  }, [geoSearchTerm]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLatestState("loading");
      try {
        const query = new URLSearchParams({ variable, lat: lat.toFixed(4), lon: lon.toFixed(4) });
        const response = await fetch(`/api/latest?${query}`, { signal: controller.signal });
        const data = (await response.json()) as LatestObservation;
        if (!response.ok) throw new Error(data.error ?? `NASA POWER returned HTTP ${response.status}.`);
        if (cancelled) return;
        setLatestObservation(data.unavailable ? null : data);
        setLatestState(data.unavailable ? "unavailable" : "ready");
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return;
        setLatestObservation(null);
        setLatestState("error");
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [variable, lat, lon, latestRefresh]);

  // ---------- elapsed timer while running
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const dialog = setupDialogRef.current;
    if (!dialog) return;
    if (setupOpen && !dialog.open) dialog.showModal();
    if (!setupOpen && dialog.open) dialog.close();
  }, [setupOpen]);

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (expandedRun !== null && dialog && !dialog.open) dialog.showModal();
  }, [expandedRun]);

  const filteredVars = useMemo(() => {
    const q = varQuery.trim().toLowerCase();
    if (!q) return VARIABLES;
    return VARIABLES.filter(
      (v) =>
        v.code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.longName.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
    );
  }, [varQuery]);

  const stageIndex = useMemo(() => {
    let idx = 0;
    for (const s of STAGES) if (elapsed >= s.at) idx = STAGES.indexOf(s);
    return idx;
  }, [elapsed]);

  const validate = useCallback((): string | null => {
    if (!getVariable(variable)) return "Select a NASA POWER variable.";
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) return "Latitude must be between −90 and 90.";
    if (!Number.isFinite(lon) || Math.abs(lon) > 180) return "Longitude must be between −180 and 180.";
    if (!startDate || !endDate) return "Both start and end dates are required.";
    if (startDate < POWER_AVAILABLE_FROM) return `NASA POWER data begins on ${POWER_AVAILABLE_FROM}.`;
    if (endDate > TODAY) return "End date cannot be in the future.";
    if (startDate > endDate) return "Start date must be on or before end date.";
    if (resolution === "monthly") {
      const months = (Date.parse(endDate) - Date.parse(startDate)) / (30.44 * 86400000);
      if (months < 12) return "Monthly analysis requires at least a 1-year range.";
    }
    return null;
  }, [variable, lat, lon, startDate, endDate, resolution]);

  const runAnalysis = useCallback(
    async (demo = false) => {
      const problem = validate();
      if (problem) {
        setFieldError(problem);
        return;
      }
      setSetupOpen(false);
      const sequence = ++runSequence.current;
      setFieldError(null);
      setError(null);
      setRunning(true);
      setElapsed(0);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variable,
            latitude: lat,
            longitude: lon,
            locationName: locationName.trim() || `Custom point (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
            startDate,
            endDate,
            resolution,
            alpha,
            persist,
            demo,
            demoAck: demo,
          }),
        });
        const data = (await res.json()) as AnalysisResponse & { error?: string; code?: string; liveFailed?: boolean };
        if (!res.ok) {
          setError({ message: data.error ?? `Analysis failed (HTTP ${res.status}).`, code: data.code });
          return;
        }
        setCompletedRuns((runs) => [{ sequence, result: data }, ...runs].slice(0, 6));
        setExpandedRun(sequence);
      } catch {
        setError({ message: "Network error — the analysis request never completed. Check your connection and retry." });
      } finally {
        setRunning(false);
      }
    },
    [validate, variable, lat, lon, locationName, startDate, endDate, resolution, alpha, persist]
  );

  const pickGeo = (g: GeoResult) => {
    setLocationName(g.name);
    setLat(g.latitude);
    setLon(g.longitude);
    setGeoOpen(false);
    setGeoQuery("");
  };

  const compareHref = `/compare?var=${variable}&aLat=${lat}&aLon=${lon}&aName=${encodeURIComponent(locationName)}&start=${startDate}&end=${endDate}&res=${resolution}`;
  const progress = Math.min(96, Math.round(8 + elapsed * 6));

  return (
    <div className="mx-auto max-w-[1560px] px-4 pb-20 pt-0 sm:px-8">
      <div className="mt-0 flex flex-col gap-5">
        {/* ── Left Column: Compact Analysis Setup ── */}
        <dialog
          ref={setupDialogRef}
          onCancel={(event) => { event.preventDefault(); setSetupOpen(false); }}
          onClick={(event) => { if (event.target === event.currentTarget) setSetupOpen(false); }}
          className="m-auto max-h-[calc(100dvh-24px)] w-[min(96vw,768px)] max-w-none overflow-hidden rounded-xl border border-white/[0.12] bg-[#060c18]/95 p-4 text-slate-100 shadow-2xl backdrop-blur-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm sm:p-5"
          aria-labelledby="analysis-setup-title"
        >
            <div className="mb-3.5 flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h2 id="analysis-setup-title" className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-sky-400">Analysis Setup</h2>
                <p className="text-[0.65rem] text-slate-400">Configure NASA POWER data request</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.58rem] text-slate-400">01–03</span>
                <button
                  type="button"
                  onClick={() => setSetupOpen(false)}
                  aria-label="Close analysis setup"
                  title="Close setup"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          <div id="analysis-setup-controls" className="space-y-3.5">
            {/* Step 01: Environmental Variable */}
            <div ref={varPanelRef} className="relative border-b border-white/[0.08] pb-3.5">
              <label className="block font-mono text-[0.62rem] uppercase tracking-wider text-slate-400 mb-1.5" htmlFor="var-search">
                01 · Environmental Variable
              </label>
              <button
                id="var-search"
                onClick={() => setVarOpen((v) => !v)}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-white/[0.09] bg-white/[0.03] px-3 text-left transition-colors hover:bg-white/[0.06] hover:border-white/20"
                aria-expanded={varOpen}
                aria-haspopup="listbox"
              >
                <span className="min-w-0 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: selectedVar.color }} />
                  <span className="truncate text-xs font-medium text-white">{selectedVar.name}</span>
                  <span className="font-mono text-[0.58rem] text-slate-400">({selectedVar.code})</span>
                </span>
                <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${varOpen ? "rotate-180" : ""}`} />
              </button>

              {varOpen && (
                <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-white/[0.12] bg-[#0a1224] shadow-2xl backdrop-blur-2xl" role="listbox">
                  <div className="flex items-center gap-2 border-b border-white/[0.08] p-2">
                    <Search size={13} className="ml-1 text-slate-400" />
                    <input
                      autoFocus
                      value={varQuery}
                      onChange={(e) => setVarQuery(e.target.value)}
                      placeholder="Search parameters, e.g. precipitation…"
                      className="h-7 w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                      aria-label="Filter variables"
                    />
                    {varQuery && (
                      <button onClick={() => setVarQuery("")} aria-label="Clear filter">
                        <X size={14} className="text-slate-400 hover:text-white" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {CATEGORIES.map((cat) => {
                      const items = filteredVars.filter((v) => v.category === cat);
                      if (!items.length) return null;
                      return (
                        <div key={cat}>
                          <div className="px-2 pb-1 pt-1.5 font-mono text-[0.52rem] uppercase tracking-wider text-slate-400">{cat}</div>
                          {items.map((v) => (
                            <button
                              key={v.code}
                              role="option"
                              aria-selected={v.code === variable}
                              onClick={() => { setVariable(v.code); setVarOpen(false); setVarQuery(""); }}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${v.code === variable ? "bg-cyan/15 text-white ring-1 ring-inset ring-cyan/40" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: v.color }} />
                                <span>{v.name}</span>
                                <span className="font-mono text-[0.55rem] text-slate-400">{v.code}</span>
                              </span>
                              {v.code === variable && <Check size={13} className="shrink-0 text-cyan" />}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="mt-1 text-[0.62rem] text-slate-400 leading-tight truncate">{selectedVar.description}</p>
            </div>

            {/* Step 02: Location */}
            <div ref={geoPanelRef} className="relative border-b border-white/[0.08] pb-3.5">
              <label className="block font-mono text-[0.62rem] uppercase tracking-wider text-slate-400 mb-1.5" htmlFor="geo-search">
                02 · Location Coordinates
              </label>
              
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  id="geo-search"
                  value={geoQuery}
                  onChange={(e) => { setGeoQuery(e.target.value); setGeoOpen(true); }}
                  onFocus={() => setGeoOpen(true)}
                  placeholder="Search city, e.g. Islamabad, Nairobi…"
                  className="h-8 w-full rounded-lg border border-white/[0.09] bg-white/[0.03] pl-8 pr-8 text-xs text-white placeholder-slate-500 transition-colors focus:border-sky-400 focus:outline-none"
                  autoComplete="off"
                  aria-label="Search for a city"
                />
                {geoLoading && <Loader2 size={13} className="absolute right-2.5 animate-spin text-sky-400" />}
              </div>

              {geoOpen && geoSuggestions.length > 0 && (
                <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-white/[0.12] bg-[#0a1224] shadow-2xl backdrop-blur-2xl">
                  {geoSuggestions.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => pickGeo(g)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <span className="truncate font-medium">{g.name}</span>
                      <span className="shrink-0 font-mono text-[0.58rem] text-slate-400">{g.latitude.toFixed(2)}°, {g.longitude.toFixed(2)}°</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="block font-mono text-[0.55rem] uppercase text-slate-400 mb-0.5">Latitude</span>
                  <input
                    id="lat"
                    type="number"
                    step="0.0001"
                    min={-90}
                    max={90}
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 font-mono text-xs text-white tabular-nums focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="block font-mono text-[0.55rem] uppercase text-slate-400 mb-0.5">Longitude</span>
                  <input
                    id="lon"
                    type="number"
                    step="0.0001"
                    min={-180}
                    max={180}
                    value={lon}
                    onChange={(e) => setLon(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 font-mono text-xs text-white tabular-nums focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="mt-2 h-8 w-full rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                maxLength={120}
                aria-label="Location label"
                placeholder="Location label"
              />

              <div className="mt-2 flex flex-wrap gap-1">
                {CITY_EXAMPLES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => { setLocationName(c.name); setLat(c.latitude); setLon(c.longitude); }}
                    aria-pressed={Math.abs(lat - c.latitude) < 0.001 && Math.abs(lon - c.longitude) < 0.001}
                    className={`rounded-md border px-2 py-1 font-mono text-[0.58rem] transition-colors ${
                      Math.abs(lat - c.latitude) < 0.001 && Math.abs(lon - c.longitude) < 0.001
                        ? "border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_12px_rgba(15,157,154,0.16)]"
                        : "border-white/[0.1] bg-white/[0.03] text-slate-300 hover:border-cyan/40 hover:text-cyan"
                    }`}
                  >
                    {c.name.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>

            {!showAdvanced ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(true)}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[0.62rem] font-medium uppercase tracking-[0.14em] text-slate-300 transition-all hover:border-sky-400/30 hover:bg-sky-400/5 hover:text-white"
                >
                  Continue to analysis details
                </button>
              </div>
            ) : (
              <>
                {/* Step 03: Time Period & Resolution */}
                <div>
                  <span className="block font-mono text-[0.62rem] uppercase tracking-wider text-slate-400 mb-1.5">
                    03 · Time Period &amp; Resolution
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block font-mono text-[0.55rem] uppercase text-slate-400 mb-0.5">Start Date</span>
                      <input
                        id="start"
                        type="date"
                        min={POWER_AVAILABLE_FROM}
                        max={TODAY}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-full rounded-lg border border-white/[0.09] bg-white/[0.03] px-2 font-mono text-[0.7rem] text-white tabular-nums focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block font-mono text-[0.55rem] uppercase text-slate-400 mb-0.5">End Date</span>
                      <input
                        id="end"
                        type="date"
                        min={POWER_AVAILABLE_FROM}
                        max={TODAY}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-full rounded-lg border border-white/[0.09] bg-white/[0.03] px-2 font-mono text-[0.7rem] text-white tabular-nums focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Segmented Resolution Switch */}
                  <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1" role="radiogroup" aria-label="Temporal resolution">
                    {(["monthly", "daily"] as const).map((r) => (
                      <button
                        key={r}
                        role="radio"
                        aria-checked={resolution === r}
                        onClick={() => setResolution(r)}
                        className={`rounded-md py-1.5 text-center text-xs font-medium transition-all ${
                          resolution === r
                            ? "bg-cyan text-slate-950 shadow-[0_0_16px_rgba(15,157,154,0.28)] font-semibold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="capitalize">{r}</span>
                        <span className="block font-mono text-[0.52rem] opacity-75">
                          {r === "monthly" ? "Trend Recommended" : "Seasonal MK"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Alpha threshold & Save history row */}
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[0.58rem] uppercase text-slate-400">α Sig</span>
                      {[0.01, 0.05, 0.1].map((a) => (
                        <button
                          key={a}
                          onClick={() => setAlpha(a)}
                          className={`rounded px-2 py-0.5 font-mono text-[0.6rem] transition-all ${
                            alpha === a
                              ? "border border-sky-400/50 bg-sky-400/15 text-sky-300 font-semibold"
                              : "border border-white/[0.08] text-slate-400 hover:text-white"
                          }`}
                          aria-pressed={alpha === a}
                        >
                          {a}
                        </button>
                      ))}
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[0.58rem] text-slate-400 hover:text-slate-300">
                      <input
                        type="checkbox"
                        checked={persist}
                        onChange={(e) => setPersist(e.target.checked)}
                        className="h-3 w-3 rounded accent-sky-400"
                      />
                      Save History
                    </label>
                  </div>
                </div>

                {/* Error banner */}
                {fieldError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {fieldError}
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-1 space-y-2">
                  <button
                    onClick={() => runAnalysis(false)}
                    disabled={running}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 text-xs font-semibold text-slate-950 transition-all hover:bg-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.25)] active:scale-[0.99] disabled:opacity-50"
                  >
                    {running ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                    {running ? `Analyzing… ${elapsed.toFixed(0)}s` : "Run Earth Analysis"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(false)}
                    className="flex w-full items-center justify-center gap-1.5 text-center font-mono text-[0.62rem] text-slate-400 hover:text-sky-300 transition-colors"
                  >
                    Hide advanced options
                  </button>

                  <Link
                    href={compareHref}
                    className="flex items-center justify-center gap-1.5 text-center font-mono text-[0.62rem] text-slate-400 hover:text-sky-300 transition-colors"
                  >
                    <ArrowRightLeft size={11} /> Compare location head-to-head →
                  </Link>
                </div>
              </>
            )}
          </div>
        </dialog>

        {/* ── Right Column: Interactive Observation Map & Feed ── */}
        <div className="order-1 flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-wider text-slate-400">
              <Compass size={12} className="text-sky-400" /> Select on Map — Click to Relocate Observation Point
            </span>
            <span className="font-mono text-[0.62rem] tabular-nums text-sky-400 font-semibold">
              {lat.toFixed(4)}°, {lon.toFixed(4)}°
            </span>
          </div>

          <div id="location" className="relative h-[380px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl">
            <EarthMap
              height="100%"
              initialLayer="satellite"
              initialZoom={4}
              initialCenter={[lat, lon]}
              locations={[{ name: locationName, latitude: lat, longitude: lon, color: selectedVar.color }]}
              selected={{ latitude: lat, longitude: lon }}
              onPick={(la, lo) => {
                setLat(la);
                setLon(lo);
                setLocationName((n) =>
                  n.startsWith("Custom point") || n === "" ? `Custom point (${la.toFixed(2)}°, ${lo.toFixed(2)}°)` : n
                );
              }}
            />

            {running && (
              <div className="earth-map-scan-overlay" aria-hidden="true">
                <div className="earth-map-scan-wash" />
                <div className="earth-map-scan-sweep" />
                <div className="earth-map-scan-hud">
                  <span className="earth-map-scan-indicator" />
                  <span>Scanning Earth</span>
                  <span className="earth-map-scan-divider" />
                  <span>{STAGES[stageIndex].label}</span>
                </div>
                <div className="earth-map-scan-coordinates">
                  LAT {lat.toFixed(4)}° <span>·</span> LON {lon.toFixed(4)}°
                </div>
              </div>
            )}
          </div>

          {!setupOpen && (
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              aria-expanded="false"
              aria-controls="analysis-setup-controls"
              className="mx-auto flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-cyan/50 bg-[#071426]/95 px-6 text-sm font-semibold text-white shadow-[0_0_28px_rgba(15,157,154,0.24)] backdrop-blur transition-all hover:border-cyan hover:bg-cyan/15 hover:shadow-[0_0_36px_rgba(15,157,154,0.36)]"
            >
              <Rocket size={17} className="text-cyan" /> Configure &amp; Analyze
            </button>
          )}

          {/* Integrated Telemetry Information Strip */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-[#060c18]/70 p-3 text-[0.68rem] leading-relaxed text-slate-400 backdrop-blur-md">
              <div className="flex items-center gap-1.5 font-mono text-[0.58rem] uppercase text-slate-300 font-semibold mb-1">
                <CalendarClock size={12} className="text-sky-400" /> Point Assimilation Notice
              </div>
              <p>
                NASA POWER reports the grid cell containing your coordinates (~0.5° ≈ 55 km). A single coordinate point does not aggregate a whole region.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#060c18]/70 p-3 backdrop-blur-md">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-400">
                <Satellite size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.52rem] uppercase tracking-wider text-slate-400">
                  Latest NASA Observation · {selectedVar.name}
                </p>
                {latestState === "ready" && latestObservation ? (
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-base font-bold tabular-nums text-white">
                      {latestObservation.value.toFixed(1)} <span className="text-xs font-medium text-slate-400">{latestObservation.unit}</span>
                    </span>
                    <span className="font-mono text-[0.54rem] text-slate-400">{latestObservation.date} · MERRA-2</span>
                  </div>
                ) : (
                  <p className="text-[0.65rem] text-slate-400 mt-0.5">Fetching latest value…</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLatestRefresh((v) => v + 1)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition-colors"
                aria-label="Refresh observation"
                disabled={latestState === "loading"}
              >
                <RefreshCw size={12} className={latestState === "loading" ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Real-Time On-Screen Loading Modal Overlay ── */}
      {running && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-busy="true"
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/[0.12] bg-[#070e1c] p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.85)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan to-blue-500" />
            
            {/* Header: Rotating Satellite & Live Processing Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-400">
                  <span aria-hidden="true" className="absolute inset-0 rounded-xl border border-sky-400/50 border-t-transparent animate-spin" />
                  <Satellite size={22} className="text-sky-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                    </span>
                    <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-sky-400">
                      Live Telemetry Analysis · In Progress
                    </p>
                  </div>
                  <h2 className="mt-1 truncate font-display text-lg font-bold text-white sm:text-xl">
                    {selectedVar.name} · {locationName || "Custom Coordinate"}
                  </h2>
                  <p className="font-mono text-[0.62rem] text-slate-400">
                    {startDate} → {endDate} · {resolution} resolution · α = {alpha}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-right">
                <div className="font-display text-2xl font-bold tabular-nums text-white">
                  {elapsed.toFixed(0)}<span className="text-sm text-slate-400">s</span>
                </div>
                <div className="font-mono text-[0.55rem] uppercase tracking-wider text-slate-400">Elapsed Time</div>
              </div>
            </div>

            {/* 5-Step Pipeline Progress */}
            <div className="mt-6">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-slate-400 mb-2.5">
                Execution Pipeline Stages
              </p>
              <ol className="grid gap-2 sm:grid-cols-5">
                {STAGES.map((s, i) => {
                  const done = i < stageIndex;
                  const active = i === stageIndex;
                  return (
                    <li
                      key={i}
                      className={`rounded-xl border p-2.5 transition-all duration-300 ${
                        done
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : active
                          ? "border-sky-400/60 bg-sky-500/15 ring-1 ring-sky-400/30"
                          : "border-white/[0.06] bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[0.58rem] uppercase font-semibold">
                        {done ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : active ? (
                          <Loader2 size={13} className="animate-spin text-sky-400" />
                        ) : (
                          <span className="h-2 w-2 rounded-full border border-white/20" />
                        )}
                        <span className={done ? "text-emerald-400" : active ? "text-sky-300" : "text-slate-500"}>
                          Stage 0{i + 1}
                        </span>
                      </div>
                      <p className={`mt-1.5 text-[0.68rem] leading-snug line-clamp-2 ${done || active ? "text-slate-200" : "text-slate-500"}`}>
                        {s.label}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Progress Bar & Status Text */}
            <div className="mt-6">
              <div className="flex items-center justify-between font-mono text-[0.65rem] mb-2">
                <span className="text-sky-300 flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  {STAGES[stageIndex].label}
                </span>
                <span className="font-bold tabular-nums text-white">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-center font-mono text-[0.6rem] text-slate-500">
              Direct connection to NASA POWER API · Compiling statistical matrices on returned observation points
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------ error ------------------------------ */}
      {error && !running && (
        <div className="mt-6 rounded-xl border border-coral/45 bg-coral/[0.08] p-5" role="alert">
          <div className="flex items-start gap-3">
            <CircleAlert size={22} className="mt-0.5 shrink-0 text-coral" />
            <div className="min-w-0">
              <h2 className="font-display font-bold text-ice">Live analysis failed</h2>
              <p className="mt-1 text-[0.83rem] leading-relaxed text-[#ffc5bc]">{error.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => runAnalysis(false)} className="btn btn-ghost !text-[0.7rem]">Retry live analysis</button>
                <button onClick={() => runAnalysis(true)} className="btn btn-ghost !border-amber/40 !text-[0.7rem] !text-amber hover:!bg-amber/10">Run synthetic DEMO instead</button>
              </div>
              <p className="mt-2 text-[0.62rem] text-faint">Demo mode generates a local synthetic series with identical statistics and labels it everywhere as synthetic — it is never presented as NASA data.</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ completed runs ------------------------------ */}
      {completedRuns.length > 0 && (
        <section className="mt-8 space-y-4" aria-label="Completed analyses">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <p className="kicker">Session Archive</p>
              <h2 className="mt-1 font-display text-xl font-bold text-ice">Completed analyses <span className="font-mono text-sm font-medium text-cyan">{completedRuns.length}</span></h2>
            </div>
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-faint">Newest first · latest six runs</p>
          </div>
          {completedRuns.map(({ sequence, result: completed }) => {
            const p = completed.payload;
            const isExpanded = expandedRun === sequence;
            const verdict = p.verdict === "increasing" ? "Increasing" : p.verdict === "decreasing" ? "Decreasing" : p.verdict === "insufficient" ? "Insufficient data" : "No significant trend";
            return (
              <div key={sequence} id={`analysis-run-${sequence}`} className="scroll-mt-24">
                <article className="panel-flat overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedRun(sequence)}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-cyan/[0.03] sm:p-5"
                    aria-expanded={isExpanded}
                    aria-haspopup="dialog"
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border ${completed.demo ? "border-amber/35 bg-amber/10 text-amber" : "border-cyan/30 bg-cyan/10 text-cyan"}`}>
                      <Check size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[0.53rem] uppercase tracking-[0.2em] text-cyan">Run {String(sequence).padStart(2, "0")} · Complete</span>
                      <span className="mt-1 block truncate font-display text-sm font-semibold text-ice">{p.locationName} <span className="text-faint">/</span> {p.variableName}</span>
                      <span className="mt-1 block font-mono text-[0.58rem] text-faint">{p.startDate} → {p.endDate} · {p.nObs.toLocaleString()} observations · {p.unit}/decade</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`hidden rounded-full border px-2.5 py-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] sm:inline-flex ${completed.demo ? "border-amber/35 text-amber" : "border-cyan/25 text-cyan"}`}>{completed.demo ? "Synthetic demo" : "NASA POWER"}</span>
                      <span className="hidden rounded-full border border-line px-2.5 py-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-mist md:inline-flex">{verdict}</span>
                      <ChevronDown size={17} className={`text-cyan transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                </article>
              </div>
            );
          })}
        </section>
      )}

      {expandedRun !== null && (() => {
        const activeRun = completedRuns.find((run) => run.sequence === expandedRun);
        if (!activeRun) return null;
        const payload = activeRun.result.payload;
        const titleId = `analysis-dialog-title-${activeRun.sequence}`;

        return (
          <dialog
            ref={detailsDialogRef}
            className="analysis-details-dialog"
            aria-labelledby={titleId}
            onClose={() => setExpandedRun(null)}
            onClick={(event) => {
              if (event.target === event.currentTarget) event.currentTarget.close();
            }}
          >
            <div className="analysis-details-dialog-inner">
              <header className="analysis-details-dialog-header">
                <div className="min-w-0">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-cyan">
                    Run {String(activeRun.sequence).padStart(2, "0")} · {activeRun.result.demo ? "Synthetic demo" : "NASA analysis"}
                  </p>
                  <h2 id={titleId} className="mt-1 truncate font-display text-lg font-semibold text-ice">
                    {payload.locationName} / {payload.variableName}
                  </h2>
                  <p className="mt-1 font-mono text-[0.58rem] text-faint">
                    {payload.startDate} → {payload.endDate} · {payload.nObs.toLocaleString()} observations
                  </p>
                </div>
                <button
                  type="button"
                  className="analysis-details-dialog-close"
                  aria-label="Close analysis results"
                  onClick={() => detailsDialogRef.current?.close()}
                >
                  <X size={16} />
                </button>
              </header>
              <div id={`analysis-details-${activeRun.sequence}`} className="p-3 sm:p-5">
                <ResultsDashboard result={activeRun.result} />
              </div>
            </div>
          </dialog>
        );
      })()}
    </div>
  );
}
