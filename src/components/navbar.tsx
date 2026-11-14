"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Rocket, X, ChevronRight, Activity } from "lucide-react";
import Logo from "@/components/logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explorer", label: "Trend Explorer" },
  { href: "/compare", label: "Location Compare" },
  { href: "/history", label: "Research Archive" },
  { href: "/data-sources", label: "Data & Methods" },
  { href: "/about", label: "About" },
];

function UtcClock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.14em] text-slate-400 tabular-nums xl:inline-flex">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      {now}
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      className={`no-print sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/[0.08] bg-[#030713]/90 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          : "border-b border-white/[0.04] bg-[#030713]/75 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
        {/* Official Logo */}
        <Link href="/" className="shrink-0 flex items-center transition-opacity hover:opacity-95" aria-label="Z9 EarthScope home">
          <Logo />
        </Link>

        {/* Central Segmented Pill Navigation */}
        <nav className="hidden items-center rounded-full border border-white/[0.08] bg-white/[0.02] p-1 lg:flex shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" aria-label="Primary navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-4 py-1.5 text-[0.78rem] font-medium transition-all duration-200 tracking-wide ${
                  active
                    ? "bg-white/[0.1] text-white shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-sky-400 to-blue-500 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Status & Launch Explorer CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-[0.6rem] text-emerald-400 xl:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="font-semibold tracking-wider uppercase">NASA POWER LIVE</span>
          </div>

          <UtcClock />

          <Link
            href="/explorer"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-all hover:bg-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.25)] active:scale-[0.98]"
          >
            <Rocket size={14} strokeWidth={2.4} />
            <span className="hidden sm:inline">Launch Explorer</span>
            <span className="sm:hidden">Launch</span>
          </Link>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 top-[68px] z-40 overflow-y-auto bg-[#030713]/98 backdrop-blur-2xl lg:hidden">
          <nav className="mx-auto max-w-lg px-5 py-8 space-y-1.5" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-4 py-3.5 transition-all ${
                    active
                      ? "bg-white/[0.08] border border-white/[0.1] text-white"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <ChevronRight size={15} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                </Link>
              );
            })}
            <div className="pt-6 px-4 border-t border-white/[0.08] mt-6 flex flex-col gap-2 font-mono text-[0.62rem] text-slate-500">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Direct NASA POWER Open Telemetry
              </span>
              <span>Z9 Space Labs · EarthScope Platform</span>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
