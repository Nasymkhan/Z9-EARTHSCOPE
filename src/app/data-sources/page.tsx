import type { Metadata } from "next";
import Link from "next/link";
import {
  Database, ExternalLink, CheckCircle2, FlaskConical, Satellite, ShieldCheck,
  Calendar, Layers, ArrowUpRight,
} from "lucide-react";
import { VARIABLES } from "@/lib/variables";
import MethodologyReference from "@/components/methodology-reference";

export const metadata: Metadata = {
  title: "Data & Methods — Z9 EarthScope",
  description:
    "Every dataset Z9 EarthScope uses, with units, coverage, API endpoints, attribution requirements and the roadmap for MODIS, GPM and Earthdata integration.",
};

const PARAMETER_ROWS = VARIABLES.map((v) => ({
  code: v.code,
  name: v.name,
  long: v.longName,
  unit: v.unit,
  category: v.category,
  notes: v.notes,
}));

const LINKS = [
  { label: "NASA POWER — Mission Portal", href: "https://power.larc.nasa.gov/" },
  { label: "NASA POWER — API Documentation", href: "https://power.larc.nasa.gov/api/pages/" },
  { label: "NASA POWER — Parameter Lookup & Units", href: "https://power.larc.nasa.gov/docs/methodology/parameters/" },
  { label: "NASA POWER — Temporal Point API Reference", href: "https://power.larc.nasa.gov/docs/services/" },
  { label: "MERRA-2 — Modern-Era Retrospective Reanalysis", href: "https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/" },
  { label: "CERES — Clouds & the Earth's Radiant Energy System", href: "https://ceres.larc.nasa.gov/" },
  { label: "NASA Earthdata — Open Data Portal", href: "https://www.earthdata.nasa.gov/" },
];

const ROADMAP = [
  ["Q4 2026 · MODIS Vegetation Indices", "16-day 250 m / 1 km NDVI/EVI vegetation change from Terra and Aqua.", "Requires an AppEEARS access and tiling pipeline with land-mask handling; it will not be labelled live until the data and attribution path is complete."],
  ["Q1 2027 · Gridded Regional Trend Maps", "Pixel-wise Mann–Kendall statistics over precomputed monthly grids.", "Requires a precompute pipeline and map tiles. Results will be clearly distinguished from point analysis and station measurements."],
  ["Q1 2027 · GPM IMERG Precipitation", "Half-hourly 0.1° satellite precipitation (IMERG V07).", "Requires Earthdata OAuth and HDF5/NetCDF processing before the feed can be integrated."],
  ["Q2 2027 · Ground-Station Overlay", "GHCN-Daily station context for grid-cell versus station comparisons.", "Requires station matching, quality checks, and explicit treatment of differences in spatial scale."],
  ["Q2 2027 · Report Export & Permalinks", "PDF export with embedded charts and shareable analysis links.", "Requires server-side report rendering and stable, reproducible analysis records."],
  ["Planned · NASA Earthdata Unified Access", "Protected products such as OCO-2, AIRS, and SMAP.", "Requires user accounts and a credential flow; deliberately not presented as supported in this public release."],
];

export default function DataSourcesPage() {
  return (
    <div id="data-sources" className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-sky-300">
            <Database size={12} /> Open Science Documentation
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">
            Data <span className="bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">&amp; Methods</span>
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
            Every observation in Z9 EarthScope traces to a citable NASA Earth-science product. This reference details active datasets, units, mathematical test formulations, and the planned roadmap.
          </p>
        </div>

        {/* Section Jump Nav */}
        <nav className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 self-start sm:self-auto">
          {[
            ["NASA POWER Feeds", "#feeds"],
            ["Variable Catalog", "#catalog"],
            ["Statistical Protocol", "#methodology"],
            ["Roadmap", "#roadmap"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* ── Active Feed Card ── */}
      <section id="feeds" className="mt-8 rounded-2xl border border-white/[0.08] bg-[#050c1b]/80 p-6 backdrop-blur-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase text-emerald-400">
                <CheckCircle2 size={12} /> Live API Integration
              </span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 font-mono text-[0.6rem] text-slate-400">
                NASA Open Data Policy
              </span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold text-white">
              NASA POWER <span className="text-slate-400 font-normal">— Prediction Of Worldwide Energy Resources</span>
            </h2>

            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              POWER delivers NASA Earth-observation and assimilation data as analysis-ready time series for any coordinate on Earth. Z9 EarthScope queries the temporal point API (daily and monthly) with the Agronomy (AG) community. Inputs include <strong className="text-white">MERRA-2 reanalysis</strong> (temperature, humidity, wind, precipitation) and <strong className="text-white">CERES/SRB</strong> radiative flux satellite models.
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
              {[
                ["Coverage", "1984 → Present"],
                ["Spatial Grid", "0.5° × 0.625°"],
                ["Sensor Heritage", "MERRA-2 & CERES"],
                ["License", "Open Science (NASA)"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <dt className="text-[0.55rem] uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="mt-1 font-semibold text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hidden xl:flex flex-col items-center justify-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] w-52 text-center">
            <Satellite size={48} className="text-sky-400 animate-pulse" />
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-wider text-slate-400">NASA LaRC</p>
            <p className="text-[0.72rem] text-slate-300 font-semibold">Langley Research Center</p>
          </div>
        </div>

        {/* ── Parameters Catalog ── */}
        <div id="catalog" className="mt-8 border-t border-white/[0.08] pt-6">
          <h3 className="font-display text-lg font-bold text-white mb-4">
            Seven Supported NASA POWER Variables
          </h3>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#030814]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] font-mono text-[0.62rem] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Parameter Name</th>
                  <th className="p-3.5">Unit</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Scientific Heritage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {PARAMETER_ROWS.map((r) => (
                  <tr key={r.code} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-sky-400">{r.code}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{r.name}</div>
                      <div className="text-[0.68rem] text-slate-500">{r.long}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{r.unit}</td>
                    <td className="p-3.5 text-slate-400">{r.category}</td>
                    <td className="p-3.5 text-slate-400 leading-snug">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Links */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/[0.06]">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-sky-400/30 transition-all"
            >
              {l.label} <ExternalLink size={11} className="opacity-50" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Statistical Protocol & Mathematical Formulations ── */}
      <div className="mt-10">
        <MethodologyReference />
      </div>

      {/* ── Integration Roadmap ── */}
      <section id="roadmap" className="mt-12 rounded-2xl border border-white/[0.08] bg-[#050c1b]/80 p-6 backdrop-blur-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-sky-400" />
          <h2 className="font-display text-xl font-bold text-white">Engineering &amp; Dataset Roadmap</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Planned datasets and architectural stages following the NASA Space Apps 2026 challenge requirements.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map(([phase, title, req]) => (
            <div key={phase} className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[0.6rem] font-semibold uppercase text-sky-400">{phase}</span>
                <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{req}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
