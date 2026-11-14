"use client";

import Link from "next/link";
import citableRecords from "../../data/citable-records.json";
import { useEffect, useState, useMemo } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Archive, Trash2, TrendingUp, TrendingDown, Minus, Rocket, Loader2, Radar,
  MapPin, Calendar, ArrowUpRight, Search, FileDown, ShieldCheck, Filter,
} from "lucide-react";

interface HistoryItem {
  id: string;
  variable: string;
  variableName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  resolution: string;
  startDate: string;
  endDate: string;
  verdict: string;
  significant: boolean;
  senSlopePerDecade: number;
  unit: string;
  createdAt: string;
}

type CitableRecord = (typeof citableRecords)[number];

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function AnnualTrendChart({ record }: { record: CitableRecord }) {
  const lineColor = record.statistics.verdict === "increasing"
    ? "#fb7185"
    : record.statistics.verdict === "decreasing" ? "#38bdf8" : "#fbbf24";

  return (
    <figure className="mt-4 border-y border-white/[0.07] py-3" aria-label={`Annual mean chart for ${record.title}`}>
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-slate-200">Annual means</span>
        <span className="font-mono text-[0.58rem] text-slate-500">{record.start}–{record.end} · {record.unit} · monthly averages</span>
      </figcaption>
      <div className="h-40 w-full sm:h-44" role="img" aria-label={`Annual mean ${record.label} from ${record.start} to ${record.end}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={record.annualMeans} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "var(--font-plex-mono)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              tickFormatter={(year: number) => String(year)}
              minTickGap={24}
            />
            <YAxis
              width={48}
              domain={["auto", "auto"]}
              tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "var(--font-plex-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => value.toFixed(1)}
            />
            <Tooltip
              contentStyle={{ background: "#081322", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#cbd5e1", marginBottom: 4 }}
              formatter={(value) => [`${Number(value).toFixed(2)} ${record.unit}`, "Annual mean"]}
              labelFormatter={(year) => `Year ${year}`}
            />
            <Line
              type="monotone"
              dataKey="mean"
              name="Annual mean"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 1.5, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 3, fill: lineColor, stroke: "#e2e8f0", strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function RecordCitations({ record }: { record: CitableRecord }) {
  const retrieved = new Date(record.source.retrievedAt).toISOString().slice(0, 10);
  const author = record.source.provider;
  const citationTitle = `${record.title}: ${record.place} (${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}), ${record.start}–${record.end}`;
  const apaCitation = `${author}. (${new Date(record.source.retrievedAt).getUTCFullYear()}). ${citationTitle} [NASA POWER monthly point data; ${record.source.sourceDataset.join(", ")}]. ${record.source.api}. Retrieved ${retrieved}, from ${record.source.endpoint}`;
  const bibtexKey = record.id.replace(/[^A-Za-z0-9]/g, "");
  const bibtexCitation = `@dataset{${bibtexKey},\n  author = {{${author}}},\n  title = {${citationTitle}},\n  year = {${new Date(record.source.retrievedAt).getUTCFullYear()}},\n  publisher = {NASA POWER},\n  version = {${record.source.api}},\n  url = {${record.source.endpoint}},\n  note = {Retrieved ${retrieved}; time standard ${record.source.timeStandard}}\n}`;

  return (
    <details className="mt-3 border-t border-white/[0.07] pt-3">
      <summary className="cursor-pointer font-mono text-[0.58rem] uppercase tracking-wider text-sky-300">Academic citations · APA 7 and BibTeX</summary>
      <div className="mt-3 grid gap-3 text-[0.65rem] leading-relaxed sm:grid-cols-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-300">APA 7</p>
          <p className="mt-1 break-words text-slate-400">{apaCitation}</p>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-300">BibTeX</p>
          <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.58rem] text-slate-400">{bibtexCitation}</pre>
        </div>
      </div>
    </details>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    fetch("/api/analyses", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ items?: HistoryItem[] }>)
      .then((data) => {
        if (active) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load saved investigations.");
        setItems([]);
      });
    return () => { active = false; };
  }, []);

  const remove = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Could not delete (HTTP ${response.status}).`);
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch (cause) {
      setError((cause as Error).message ?? "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesSearch =
        item.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variable.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVerdict =
        verdictFilter === "all" || item.verdict.toLowerCase() === verdictFilter.toLowerCase();
      return matchesSearch && matchesVerdict;
    });
  }, [items, searchQuery, verdictFilter]);

  const stats = useMemo(() => {
    if (!items || items.length === 0) return null;
    const total = items.length;
    const significant = items.filter((i) => i.significant).length;
    const warming = items.filter((i) => i.verdict === "increasing").length;
    const cooling = items.filter((i) => i.verdict === "decreasing").length;
    return { total, significant, warming, cooling };
  }, [items]);

  const csvContent = useMemo(() => {
    const header = ["record_id", "title", "place", "variable", "latitude", "longitude", "year", "month", "value", "unit", "source_dataset", "time_standard", "source_url"];
    const rows = citableRecords.flatMap((record) => record.observations.map((observation) => [
      record.id,
      record.title,
      record.place,
      record.variable,
      record.latitude,
      record.longitude,
      observation.year,
      observation.month,
      observation.value,
      record.unit,
      record.source.sourceDataset.join("; "),
      record.source.timeStandard,
      record.source.endpoint,
    ]));
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return `\uFEFF${csv}`;
  }, []);

  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "z9-earthscope-nasa-power-monthly-records.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const verdictColor = (v: string) =>
    v === "increasing" ? "text-rose-400" :
    v === "decreasing" ? "text-sky-400" : "text-slate-400";

  const VerdictIcon = ({ v }: { v: string }) =>
    v === "increasing" ? <TrendingUp size={14} /> :
    v === "decreasing" ? <TrendingDown size={14} /> : <Minus size={14} />;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-sky-300">
            <Archive size={12} /> Citable Investigation Records
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">
            Research <span className="bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">Archive</span>
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400">
            Every analysis you ran with &ldquo;Save to history&rdquo; enabled. Includes complete observation parameters, Sen&apos;s slope rates, Mann–Kendall test statistics, and reproducible provenance.
          </p>
        </div>
        <Link
          href="/explorer"
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-all hover:bg-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.25)] active:scale-[0.98] shrink-0"
        >
          <Rocket size={14} /> New Earth Analysis
        </Link>
      </div>

      {/* Research starters: each link opens the real NASA POWER analysis workflow. */}
      <section className="mt-7" aria-labelledby="research-starters-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-sky-400">Research ideas · NASA POWER</p>
            <h2 id="research-starters-title" className="mt-1 font-display text-xl font-bold text-white">Start an investigation</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Choose a question and run it on NASA observations. Expected outcomes are hypotheses to test; your actual results are calculated from returned data.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-wider text-emerald-300">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            Ready to run
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { level: "Easy", title: "Is Islamabad getting warmer?", question: "Test the long-term change in monthly mean air temperature in Islamabad.", variable: "T2M", lat: 33.6844, lon: 73.0479, name: "Islamabad, Pakistan", start: "2000-01-01", end: "2025-12-31", expected: "A positive, negative, or statistically insignificant trend is possible. The observed NASA data will decide.", method: "Monthly temperature · Sen’s slope · Mann–Kendall" },
            { level: "Easy", title: "How has Lahore’s rainfall changed?", question: "Examine the long-term pattern in corrected precipitation for Lahore.", variable: "PRECTOTCORR", lat: 31.5204, lon: 74.3587, name: "Lahore, Pakistan", start: "2000-01-01", end: "2025-12-31", expected: "The record may show an increase, decrease, or no significant trend. Seasonal monsoon variability can influence the result.", method: "Monthly precipitation · Trend significance" },
            { level: "Advanced", title: "Is Karachi’s heat intensifying?", question: "Test whether monthly mean maximum temperature has changed over time in Karachi.", variable: "T2M_MAX", lat: 24.8607, lon: 67.0011, name: "Karachi, Pakistan", start: "1990-01-01", end: "2025-12-31", expected: "Warming is a hypothesis, not a guaranteed finding. Interpret the slope, confidence interval, and p-value together.", method: "Monthly mean daily maxima · Sen’s slope · Mann–Kendall" },
            { level: "Advanced", title: "How is rainfall changing near Tharparkar?", question: "Investigate the long-term precipitation trend near Mithi, a representative point in Tharparkar.", variable: "PRECTOTCORR", lat: 24.7372, lon: 69.7971, name: "Mithi, Pakistan", start: "1990-01-01", end: "2025-12-31", expected: "The trend test can detect a monotonic change, but cannot alone prove changing drought frequency or explain its causes.", method: "Monthly precipitation · Data coverage · Trend significance" }
          ].map((idea) => (
            <article key={idea.title} className="rounded-2xl border border-white/[0.08] bg-[#050c1b]/65 p-4 transition-colors hover:border-sky-400/25">
              <div className="flex items-center justify-between gap-2">
                <span className={"rounded-md border px-2 py-1 font-mono text-[0.55rem] font-semibold uppercase tracking-wider " + (idea.level === "Advanced" ? "border-violet-400/25 bg-violet-400/[0.07] text-violet-300" : "border-sky-400/25 bg-sky-400/[0.07] text-sky-300")}>{idea.level}</span>
                <span className="font-mono text-[0.55rem] text-slate-500">{idea.variable} · {idea.start.slice(0,4)}–{idea.end.slice(0,4)}</span>
              </div>
              <h3 className="mt-3 font-display text-base font-bold text-white">{idea.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{idea.question}</p>
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="font-mono text-[0.54rem] uppercase tracking-wider text-sky-300">Expected outcome to test</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{idea.expected}</p>
              </div>
              <p className="mt-3 text-[0.62rem] text-slate-500">{idea.name} · {idea.method}</p>
              <Link href={"/explorer?var=" + idea.variable + "&lat=" + idea.lat + "&lon=" + idea.lon + "&name=" + encodeURIComponent(idea.name) + "&start=" + idea.start + "&end=" + idea.end + "&res=monthly"} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400">
                Configure this research <ArrowUpRight size={13} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 border-y border-white/[0.08] py-5" aria-labelledby="archive-method-title">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:gap-10">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-sky-400">Methods &amp; interpretation</p>
            <h2 id="archive-method-title" className="mt-1 font-display text-xl font-bold text-white">How to read these records</h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">The plotted annual means summarize the monthly NASA POWER values. The reported seasonal trend statistics are calculated from the monthly series.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Data &amp; method</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Each record is a NASA POWER monthly point series from one assimilated grid cell. Seasonal Mann–Kendall compares like calendar months across years; seasonal Sen slope is the median pairwise trend estimate. Tests use α = 0.05 with a two-sided normal approximation and tie correction.</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Limitations</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">A grid-cell estimate is not a station measurement or a whole-region average. Serial autocorrelation is not adjusted, significance does not establish causation, and annual means are descriptive rather than the test input. Interpret slopes, coverage, and p-values together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Real NASA POWER data snapshot with reproducible seasonal trend statistics. */}
      <section className="mt-8" aria-labelledby="citable-records-title">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-emerald-300">NASA POWER · analysed observations</p>
            <h2 id="citable-records-title" className="mt-1 font-display text-xl font-bold text-white">Citable Investigation Records</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Four analyses calculated from NASA POWER monthly point data. Charts show observed annual means; the statistics summarize the monthly seasonal tests.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/data/citable-records.json" download className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.07]">
              <FileDown size={13} /> JSON
            </a>
            <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.07]">
              <FileDown size={13} /> CSV
            </button>
            <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 font-mono text-[0.58rem] uppercase tracking-wider text-emerald-200">4 NASA analyses</span>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {citableRecords.map((record) => {
            const stats = record.statistics;
            const slope = stats.senSlopePerDecade;
            const pLabel = stats.p < 0.000001 ? "p < 0.000001" : "p = " + stats.p.toFixed(6);
            return (
              <article key={record.id} className="rounded-2xl border border-white/[0.08] bg-[#050c1b]/65 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[0.58rem] tracking-wider text-violet-300">{record.id}</span>
                  <span className={"rounded-md border px-2 py-1 font-mono text-[0.54rem] uppercase " + (stats.significant ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-200")}>{stats.significant ? "Significant · α 0.05" : "Not significant · α 0.05"}</span>
                </div>
                <h3 className="mt-3 font-display text-sm font-bold text-white">{record.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{record.place}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[0.65rem]">
                  <div className="rounded-lg bg-white/[0.03] p-2"><span className="text-slate-500">NASA POWER variable</span><p className="mt-1 font-mono text-sky-200">{record.variable}</p></div>
                  <div className="rounded-lg bg-white/[0.03] p-2"><span className="text-slate-500">Coordinates</span><p className="mt-1 font-mono text-slate-200">{record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}</p></div>
                  <div className="rounded-lg bg-white/[0.03] p-2"><span className="text-slate-500">Observation window</span><p className="mt-1 font-mono text-slate-200">{record.startDate} → {record.endDate}</p></div>
                  <div className="rounded-lg bg-white/[0.03] p-2"><span className="text-slate-500">Data coverage</span><p className="mt-1 font-mono text-slate-200">{record.seriesCount}/{record.expectedMonths} months · {record.completeYears} complete years</p></div>
                </div>
                <AnnualTrendChart record={record} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="font-mono text-[0.53rem] uppercase tracking-wider text-slate-500">Seasonal Sen slope</p>
                    <p className="mt-1 text-sm font-semibold text-white">{Number.isFinite(slope) ? slope.toFixed(4) : "—"} <span className="text-[0.6rem] font-normal text-slate-400">{stats.senSlopeUnitPerDecade}</span></p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="font-mono text-[0.53rem] uppercase tracking-wider text-slate-500">Mann–Kendall</p>
                    <p className="mt-1 text-sm font-semibold text-white">Z = {stats.z.toFixed(3)}</p>
                    <p className="text-[0.62rem] text-slate-400">S = {stats.S.toLocaleString()} · {pLabel}</p>
                  </div>
                </div>
                <p className={"mt-3 text-xs font-semibold " + (stats.verdict === "increasing" ? "text-emerald-300" : stats.verdict === "decreasing" ? "text-sky-300" : "text-amber-200")}>Observed monotonic trend: {stats.verdict}</p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-slate-400">Seasonal Mann–Kendall test (12 calendar-month strata), seasonal Sen slope, two-sided normal approximation, α = 0.05. {record.missingMonths} missing monthly values.</p>
                {stats.significant && slope === 0 && <p className="mt-2 text-[0.65rem] leading-relaxed text-amber-200">Interpretation note: the test detects a positive monotonic signal, but the median Sen slope is zero because many monthly precipitation values are tied. Do not interpret this as a measurable increase in typical monthly rate without further distribution analysis.</p>}
                <details className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <summary className="cursor-pointer font-mono text-[0.58rem] uppercase tracking-wider text-sky-300">Reproducible provenance & source query</summary>
                  <div className="mt-3 space-y-2 text-[0.65rem] text-slate-400">
                    <p>Provider: {record.source.provider}</p>
                    <p>API: {record.source.api} · Source dataset: {record.source.sourceDataset.join(", ")}</p>
                    <p>Parameter: {record.source.parameterMetadata.longname} ({record.source.parameterMetadata.units})</p>
                    <p>Retrieved: {new Date(record.source.retrievedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC · Time standard: {record.source.timeStandard} · Grid elevation: {record.source.elevationMeters?.toFixed(1)} m</p>
                    <p>Method note: {record.source.dataNote} Test variance uses tie correction; serial autocorrelation adjustment has not been applied.</p>
                    <a href={record.source.endpoint} target="_blank" rel="noreferrer" className="inline-flex break-all text-sky-300 underline decoration-sky-300/30 underline-offset-4">Open exact NASA POWER API query ↗</a>
                  </div>
                </details>
                <RecordCitations record={record} />
              </article>
            );
          })}
        </div>
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="font-mono text-[0.56rem] uppercase tracking-wider text-slate-400">Research references & interpretation</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer" className="text-sky-300 underline decoration-sky-300/30 underline-offset-4 hover:text-sky-200">NASA POWER documentation ↗</a>
            <a href="https://doi.org/10.2307/1907187" target="_blank" rel="noreferrer" className="text-sky-300 underline decoration-sky-300/30 underline-offset-4 hover:text-sky-200">Mann (1945) ↗</a>
            <a href="https://doi.org/10.1080/01621459.1968.10480934" target="_blank" rel="noreferrer" className="text-sky-300 underline decoration-sky-300/30 underline-offset-4 hover:text-sky-200">Sen (1968) ↗</a>
          </div>
          <p className="mt-2 text-[0.62rem] leading-relaxed text-slate-500">These are point estimates from NASA POWER reanalysis, not ground-station observations. Trend significance is exploratory: serial autocorrelation has not been adjusted, and the records should not be treated as peer-reviewed conclusions.</p>
        </div>
      </section>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#050c1b]/60 p-4">
            <p className="font-mono text-[0.55rem] uppercase tracking-wider text-slate-400">Total Investigations</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="font-mono text-[0.55rem] uppercase tracking-wider text-emerald-400">Significant Trends (p &lt; α)</p>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-400">{stats.significant}</p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
            <p className="font-mono text-[0.55rem] uppercase tracking-wider text-rose-400">Increasing Signals</p>
            <p className="mt-1 font-display text-2xl font-bold text-rose-400">{stats.warming}</p>
          </div>
          <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.04] p-4">
            <p className="font-mono text-[0.55rem] uppercase tracking-wider text-sky-400">Decreasing Signals</p>
            <p className="mt-1 font-display text-2xl font-bold text-sky-400">{stats.cooling}</p>
          </div>
        </div>
      )}

      {/* ── Search and Filter Bar ── */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-between rounded-xl border border-white/[0.08] bg-[#050c1b]/70 p-3 backdrop-blur-xl">
        <div className="relative w-full sm:max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by city, region, or parameter..."
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="font-mono text-[0.58rem] uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Filter size={11} /> Verdict:
          </span>
          {["all", "increasing", "decreasing", "not-significant"].map((vf) => (
            <button
              key={vf}
              type="button"
              onClick={() => setVerdictFilter(vf)}
              className={`rounded-lg px-2.5 py-1 text-xs capitalize transition-all ${
                verdictFilter === vf
                  ? "bg-sky-500 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white bg-white/[0.02]"
              }`}
            >
              {vf === "all" ? "All" : vf.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-5 py-3.5 text-xs text-rose-300" role="alert">
          {error}
        </div>
      )}

      {/* ── List Content ── */}
      {items === null ? (
        <div className="mt-8 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 w-full rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <Radar size={24} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              {items.length === 0 ? "No saved investigations yet" : "No matching investigations"}
            </h2>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              {items.length === 0
                ? "Run an analysis in the Trend Explorer with \"Save to history\" checked to preserve reproducible results."
                : "Try clearing your search query or verdict filter."}
            </p>
          </div>
          {items.length === 0 && (
            <Link
              href="/explorer"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
            >
              <Rocket size={14} /> Launch Trend Explorer
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-white/[0.08] bg-[#050c1b]/60 p-5 transition-all hover:border-sky-400/30 hover:bg-[#07132a]/80"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left side info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] ${verdictColor(item.verdict)}`}>
                    <VerdictIcon v={item.verdict} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-sm font-bold text-white">{item.locationName}</span>
                      <span className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-sky-300">
                        {item.variable}
                      </span>
                      <span className="text-xs text-slate-300 font-medium">{item.variableName}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[0.6rem] font-semibold uppercase ${
                        item.significant
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                      }`}>
                        {item.significant ? <ShieldCheck size={11} /> : null}
                        {item.verdict.replace("-", " ")}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono text-[0.68rem]">
                        <MapPin size={11} className="text-slate-500" /> {item.latitude.toFixed(3)}°, {item.longitude.toFixed(3)}°
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[0.68rem]">
                        <Calendar size={11} className="text-slate-500" /> {item.startDate} → {item.endDate} ({item.resolution})
                      </span>
                      <span className="font-mono text-[0.68rem] text-slate-200">
                        Sen&apos;s slope: <strong className="text-white">{item.senSlopePerDecade >= 0 ? "+" : ""}{item.senSlopePerDecade.toFixed(3)}</strong> {item.unit}/decade
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline font-mono text-[0.6rem] text-slate-500 mr-2">
                    {new Date(item.createdAt).toISOString().slice(0, 10)}
                  </span>
                  <Link
                    href={`/analysis/${item.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    Open <ArrowUpRight size={13} />
                  </Link>
                  <button
                    onClick={() => remove(item.id)}
                    disabled={deleting === item.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                    aria-label={`Delete ${item.variableName} analysis`}
                    title="Delete investigation"
                  >
                    {deleting === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
