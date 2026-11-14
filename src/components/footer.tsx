import Link from "next/link";
import Logo from "./logo";
import { CodeXml, MapPin, Mail, ExternalLink, Globe2, ShieldCheck, Database } from "lucide-react";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Scientific Workspaces",
    links: [
      { label: "Trend Explorer", href: "/explorer" },
      { label: "Location Compare", href: "/compare" },
      { label: "Research Archive", href: "/history" },
      { label: "Single Point Geocoder", href: "/explorer#location" },
    ],
  },
  {
    title: "Data & Methodology",
    links: [
      { label: "Statistical Protocol", href: "/data-sources#methodology" },
      { label: "7 NASA Variables Catalog", href: "/data-sources#catalog" },
      { label: "Integration Roadmap", href: "/data-sources#roadmap" },
      { label: "NASA POWER Portal", href: "https://power.larc.nasa.gov/", external: true },
    ],
  },
  {
    title: "Mission & Lab",
    links: [
      { label: "Space Apps 2026 Challenge", href: "https://www.spaceappschallenge.org/", external: true },
      { label: "GitHub Open Science", href: "https://github.com/z9-space-labs", external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="no-print relative mt-24 border-t border-white/[0.08] bg-[#020610]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent"
      />
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand Info */}
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-5 max-w-sm text-xs leading-relaxed text-slate-400">
              <strong className="text-white font-semibold">Earth System Trend Detective.</strong><br />
              An open planetary research platform for investigating NASA POWER environmental variables, computing robust Theil–Sen slope rates, and verifying statistical significance with Mann–Kendall testing.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <MapPin size={13} className="text-sky-400" /> Islamabad, Pakistan
              </span>
              <a href="mailto:bsse-25s-0102@stmu.edu.pk" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={13} className="text-sky-400" /> bsse-25s-0102@stmu.edu.pk
              </a>
              <a href="https://github.com/Nasymkhan/Z9-EARTHSCOPE" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                <CodeXml size={13} className="text-sky-400" /> github.com/Nasymkhan/Z9-EARTHSCOPE
              </a>
            </div>
          </div>

          {/* Nav Columns */}
          {COLUMNS.map((col) => (
            <div key={col.title} className="sm:col-span-4 lg:col-span-2">
              <h3 className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
                      >
                        {l.label} <ExternalLink size={10} className="opacity-50" />
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-xs text-slate-400 transition-colors hover:text-white"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Primary Scientific Feeds Card */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Supported Signals
            </h3>
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              NASA POWER hourly/daily assimilation &amp; CERES shortwave flux:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN"].map((c) => (
                <span
                  key={c}
                  className="rounded border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[0.56rem] text-slate-400"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Sub-Bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.06] pt-8 text-[0.7rem] leading-relaxed text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Z9 Space Labs · Built for the NASA Space Apps Challenge 2026.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[0.66rem] text-slate-400">
            <span>NASA Open Data Policy</span>
            <span>•</span>
            <span>Independent Student Research Project</span>
            <span>•</span>
            <span>Not Endorsed by NASA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
