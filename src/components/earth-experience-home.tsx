"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Compass,
  Globe2,
  Layers3,
  Search,
  ShieldCheck,
  Sun,
  Thermometer,
  Waves,
  Wind,
  Satellite,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import CinematicHeroEarth from "@/components/cinematic-hero-earth";
import Logo from "@/components/logo";
import SatelliteDashboard from "@/components/satellite-dashboard";

const NAV_LINKS = [
  { label: "Trend Explorer", href: "/explorer" },
  { label: "Compare", href: "/compare" },
  { label: "Archive", href: "/history" },
  { label: "Data & Methods", href: "/data-sources" },
  { label: "About", href: "/about" },
];

const SIGNALS = [
  {
    code: "T2M", name: "Surface Temperature", unit: "°C",
    icon: Thermometer, color: "text-rose-400",
  },
  {
    code: "PRECTOTCORR", name: "Precipitation", unit: "mm/day",
    icon: Waves, color: "text-sky-400",
  },
  {
    code: "ALLSKY_SFC_SW_DWN", name: "Solar Irradiance", unit: "MJ/m²",
    icon: Sun, color: "text-amber-400",
  },
  {
    code: "WS2M", name: "Wind Speed", unit: "m/s",
    icon: Wind, color: "text-emerald-400",
  },
];

const FEATURES = [
  {
    title: "Trend Explorer",
    desc: "Compute Sen's slope rates and test significance with Mann-Kendall analysis across 40+ years of NASA data.",
    href: "/explorer",
    icon: BarChart3,
    cta: "Launch Explorer",
  },
  {
    title: "Location Compare",
    desc: "Contrast environmental variables between two cities or coordinates to identify regional divergence patterns.",
    href: "/compare",
    icon: Compass,
    cta: "Compare Locations",
  },
  {
    title: "Research Archive",
    desc: "Access your saved investigations with exact statistics, reproducible results, and permanent analysis links.",
    href: "/history",
    icon: Layers3,
    cta: "View Archive",
  },
];

export default function EarthExperienceHome() {
  const [query, setQuery] = useState("");
  const [videoBackground, setVideoBackground] = useState(true);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) { window.location.href = "/explorer"; return; }
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      const data = (await response.json()) as { results?: Array<{ name: string; latitude: number; longitude: number }> };
      const place = data.results?.[0];
      if (place) {
        const params = new URLSearchParams({ var: "T2M", lat: String(place.latitude), lon: String(place.longitude), name: place.name });
        window.location.href = `/explorer?${params.toString()}`;
        return;
      }
    } catch { /* fallback */ }
    window.location.href = "/explorer";
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden text-slate-100 selection:bg-sky-500/30 selection:text-white">
      {videoBackground && (
        <>
          <video
            key="earthscope-background-video"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
            src="/StockFootageFree_pindown.io_1794519535.mp4"
            autoPlay muted loop playsInline preload="metadata" aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[#030713]/70" />
        </>
      )}

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#030a18]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="shrink-0 flex items-center gap-3" aria-label="Z9 EarthScope home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3.5 py-1.5 text-[0.8rem] font-medium text-slate-400 transition-all hover:text-white hover:bg-white/[0.04]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setVideoBackground((c) => !c)}
              aria-label={videoBackground ? "Static background" : "Video background"}
              className={`hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${videoBackground
                  ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                  : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
            >
              {videoBackground ? <ImageIcon size={15} /> : <Video size={15} />}
            </button>

            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1 font-mono text-[0.56rem] text-emerald-400 xl:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="font-semibold tracking-wider uppercase">NASA POWER</span>
            </div>

            <Link
              href="/explorer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[0.76rem] font-semibold text-slate-950 transition-all hover:bg-slate-100 active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              Launch Explorer <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 sm:px-8">
        <section className="relative pt-4 pb-16 lg:pt-6 lg:pb-20">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(300px,0.85fr)_minmax(460px,1.4fr)_minmax(320px,0.9fr)] lg:gap-6">

            {/* Left Column */}
            <div className="order-2 lg:order-1 flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 font-mono text-[0.56rem] font-medium tracking-[0.14em] uppercase text-slate-400">
                <Satellite size={11} className="text-sky-400" /> NASA Space Apps 2026
              </div>

              <h1 className="mt-6 max-w-[540px] text-[clamp(2.6rem,5vw,4.8rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.06em] text-white">
                <span className="block">Earth System</span>
                <span className="mt-1 block bg-gradient-to-r from-sky-300 via-blue-400 to-sky-500 bg-clip-text text-transparent">
                  Trend Detective<span className="text-sky-300">.</span>
                </span>
              </h1>

              <p className="mt-5 max-w-[420px] text-[0.9rem] leading-relaxed text-slate-400">
                Explore seven NASA POWER environmental variables, visualize how they change across locations and time, and assess statistical significance.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/explorer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[0.8rem] font-semibold text-slate-950 transition-all hover:bg-slate-100 active:scale-[0.98] shadow-[0_0_24px_rgba(255,255,255,0.1)]"
                >
                  Explore Observations <ArrowRight size={14} />
                </Link>
                <Link
                  href="/data-sources"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[0.8rem] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  Scientific Methodology
                </Link>
              </div>

              {/* Metrics */}
              <div className="mt-8 flex items-center gap-6 border-t border-white/[0.06] pt-5">
                {[
                  { label: "Coverage", value: "1984–Now" },
                  { label: "Resolution", value: "0.5° Grid" },
                  { label: "Variables", value: "7 Params" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-slate-600">{label}</p>
                    <p className="mt-1 text-[0.82rem] font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Center Column: 3D Earth Globe — UNCHANGED */}
            <div className="order-1 lg:order-2 relative flex flex-col items-center justify-center">
              <div className="relative h-[440px] w-full max-w-[620px] sm:h-[540px] lg:h-[600px] flex items-center justify-center overflow-visible">
                <CinematicHeroEarth />
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#030a18]/80 px-4 py-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate-500 backdrop-blur-md pointer-events-none">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Interactive 3D Earth · Drag to Rotate
              </div>
            </div>

            {/* Right Column: Data Console */}
            <aside className="order-3 flex flex-col gap-4 lg:-translate-y-16">
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#060c18]/90 p-5 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-sky-400">
                      <Activity size={13} />
                    </div>
                    <div>
                      <h2 className="text-[0.72rem] font-semibold text-white">NASA POWER</h2>
                      <p className="text-[0.58rem] text-slate-500">Environmental variables</p>
                    </div>
                  </div>
                  <span className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.06] px-2 py-0.5 font-mono text-[0.5rem] font-medium uppercase tracking-wider text-emerald-400">
                    Live
                  </span>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="mt-4 relative flex items-center">
                  <Search size={13} className="absolute left-3 text-slate-500 pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search city or coordinates..."
                    aria-label="Location search"
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-9 pr-9 text-[0.78rem] text-white placeholder-slate-600 transition-all focus:border-sky-500/40 focus:bg-white/[0.04] focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                  />
                  <button type="submit" aria-label="Submit" className="absolute right-2.5 rounded-md p-1 text-slate-500 hover:text-white transition-colors">
                    <ArrowRight size={12} />
                  </button>
                </form>

                {/* Signal Cards */}
                <div className="mt-4 space-y-1.5">
                  {SIGNALS.map(({ code, name, unit, icon: Icon, color }) => (
                    <Link
                      key={code}
                      href={`/explorer?var=${code}`}
                      className="group flex items-center justify-between rounded-xl border border-transparent bg-transparent p-3 transition-all hover:border-white/[0.06] hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.02] ${color}`}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <span className="text-[0.78rem] font-medium text-slate-200 group-hover:text-white transition-colors">
                            {name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[0.54rem] text-slate-600">{code}</span>
                            <span className="text-[0.54rem] text-slate-600">·</span>
                            <span className="text-[0.54rem] text-slate-500">{unit}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight size={12} className="text-slate-600 transition-all group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                    </Link>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-white/[0.06] pt-3.5 flex items-center justify-between font-mono text-[0.56rem] text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-sky-400" /> Mann-Kendall &amp; Sen&apos;s Slope
                  </span>
                  <span>95% CI</span>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-16">
            <SatelliteDashboard />
          </div>

          {/* ── Bottom Feature Cards ── */}
          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ title, desc, href, icon: Icon, cta }) => (
              <Link
                key={title}
                href={href}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 transition-all hover:border-white/[0.1] hover:bg-white/[0.025]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-sky-400 group-hover:text-white transition-colors">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-[0.92rem] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-slate-400">{desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[0.74rem] font-medium text-sky-400 group-hover:text-sky-300 transition-colors">
                  {cta}
                  <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8 font-mono text-[0.56rem] text-slate-600">
          <span>Z9 EarthScope · Independent Research Platform · Powered by NASA Open Science</span>
          <div className="flex items-center gap-5">
            <Link href="/data-sources" className="hover:text-white transition-colors">Data Sources</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
