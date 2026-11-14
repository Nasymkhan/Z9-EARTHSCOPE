import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Rocket, MapPin, Mail, CodeXml, Database, Satellite, FileText, ArrowUpRight, Globe2, Shield,
  GraduationCap, MessageSquareText, Wrench, Lightbulb, Phone, Image as ImageIcon,
} from "lucide-react";
import SatelliteSimulationDisclosure from "@/components/satellite-simulation-disclosure";

export const metadata: Metadata = {
  title: "About — Z9 Space Labs & the Mission",
  description:
    "Z9 EarthScope by Z9 Space Labs (Islamabad, Pakistan) — built for the NASA Space Apps Challenge 2026, \"Be An Earth System Trend Detective!\"",
};

const STACK = [
  "Next.js 16 (App Router)", "TypeScript strict", "Tailwind CSS 4", "Recharts",
  "Leaflet + OSM/Esri tiles", "PostgreSQL + Drizzle ORM", "NASA POWER API",
  "Mann–Kendall / Theil–Sen engine", "Deterministic interpretation engine",
];

export default function AboutPage() {
  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <Image
          src="https://images-assets.nasa.gov/image/sts085-365-006/sts085-365-006~large.jpg"
          alt="Aurora australis from Space Shuttle Discovery"
          fill
          sizes="100vw"
          className="object-cover object-[60%_35%] opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030a18] via-[#030a18]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030a18] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-[1200px] px-5 py-24 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.16em] text-slate-400 backdrop-blur-sm">
            <Globe2 size={12} /> About Z9 Space Labs
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            We build instruments for
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">
              planetary literacy.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-[0.95rem] leading-relaxed text-slate-300">
            Z9 Space Labs is an independent technology initiative based in Islamabad, Pakistan. Z9 EarthScope is our response to the NASA Space Apps Challenge: make Earth-science data easier to investigate.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-[0.78rem] text-slate-400">
            <span className="inline-flex items-center gap-2"><MapPin size={13} className="text-slate-500" /> Islamabad, Pakistan · 33.68° N, 73.05° E</span>
            <span className="inline-flex items-center gap-2"><Mail size={13} className="text-slate-500" /> z9spacelabs@proton.me</span>
            <a href="https://github.com/z9-space-labs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
              <CodeXml size={13} className="text-slate-500" /> github.com/z9-space-labs
            </a>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-slate-500">
              The Mandate
            </div>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              &ldquo;Be An Earth System<br />Trend Detective!&rdquo;
            </h2>
            <p className="mt-5 text-[0.92rem] leading-relaxed text-slate-400">
              The 2026 NASA Space Apps Challenge asks teams worldwide to use open NASA Earth-science data to identify and explain environmental trends. Z9 EarthScope answers the four questions every judge — and every citizen — should demand answered:
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["What is changing?", "Where?", "How much?", "Is it significant?"].map((q) => (
                <div key={q} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5 text-center">
                  <p className="text-[0.78rem] font-medium text-white">{q}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[0.88rem] leading-relaxed text-slate-400">
              Unlike a dashboard that draws pretty lines, this platform computes Theil–Sen robust slopes, runs Mann–Kendall and seasonal Mann–Kendall tests at an operator-chosen α, quantifies coverage and autocorrelation, and refuses to cry &ldquo;trend&rdquo; on noise.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6">
              <div className="flex items-center gap-2 font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] text-slate-500">
                <Shield size={12} className="text-sky-400" /> Challenge Scorecard
              </div>
              <ul className="mt-5 space-y-3.5 text-[0.84rem] leading-snug text-slate-300">
                {[
                  "Real NASA data, live at runtime — no fabricated series",
                  "Detection with published, checkable statistics",
                  "Honest uncertainty: coverage, autocorrelation, α thresholds",
                  "Works on a phone on a slow connection in the field",
                  "Open methods — every equation on the Methodology page",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Earthrise Image */}
      <figure className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8">
        <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-white/[0.06] sm:h-72">
          <Image
            src="https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000496/GSFC_20171208_Archive_e000496~orig.png"
            alt="Earth rising over the lunar horizon"
            fill
            sizes="100vw"
            className="object-cover object-[50%_18%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030a18]/90 via-transparent to-transparent" />
          <figcaption className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-2">
            <span className="text-sm font-semibold text-white">Earthrise over the lunar horizon</span>
            <span className="font-mono text-[0.54rem] uppercase tracking-[0.18em] text-slate-400">
              NASA LRO · Goddard / Arizona State University
            </span>
          </figcaption>
        </div>
      </figure>

      {/* Presenter & credits */}
      <section className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8" aria-labelledby="presenter-title">
        <div className="mb-7">
          <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-slate-500">Presented by · Team &amp; credits</p>
          <h2 id="presenter-title" className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            Presented by <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">Naseem Khan</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Z9 EarthScope is primarily an independently developed project, with assistance from ChatGPT.</p>
        </div>

        <article className="grid overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050c1b]/65 sm:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.5fr)]">
          <div className="relative min-h-[340px] sm:min-h-[440px]">
            <Image
              src="/nasym3.jpeg"
              alt="Naseem Khan"
              fill
              sizes="(max-width: 640px) 100vw, 38vw"
              className="object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030713]/90 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-[#050c1b]/30" />
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#030713]/70 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-slate-200 backdrop-blur-md">
              <Globe2 size={12} className="text-sky-300" /> Z9 EarthScope
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-sky-300">Project Lead &amp; Primary Developer</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
              <span className="text-xs text-slate-400">Project: Z9 EarthScope</span>
            </div>
            <div className="mt-4 flex items-start gap-3 border-b border-white/[0.07] pb-4">
              <GraduationCap size={17} className="mt-0.5 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">BS Software Engineering · 4th Semester</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Shifa Tameer-e-Millat University (STMU), Islamabad</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-mono text-[0.58rem] font-semibold uppercase tracking-[0.17em] text-slate-400">My contributions</h3>
              <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {[
                  "Project concept and development",
                  "Research and NASA POWER data analysis",
                  "Technical implementation and website development",
                  "Research documentation and project presentation",
                ].map((contribution) => (
                  <li key={contribution} className="flex items-start gap-2.5 text-[0.78rem] leading-relaxed text-slate-300">
                    <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    {contribution}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-l-2 border-sky-400/60 pl-3 text-xs leading-relaxed text-slate-400">Most project work was completed independently by Naseem Khan, with ChatGPT assistance.</p>
            </div>
          </div>
        </article>

        <div className="mt-7 grid gap-8 border-t border-white/[0.08] pt-6 lg:grid-cols-[1.25fr_0.9fr_0.85fr]">
          <div>
            <h3 className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-300">Tools &amp; design references</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { icon: MessageSquareText, name: "ChatGPT", detail: "AI assistance and research support" },
                { icon: Wrench, name: "Antigravity", detail: "Development assistance" },
                { icon: CodeXml, name: "Visual Studio Code", detail: "Coding environment" },
                { icon: Lightbulb, name: "Pinterest", detail: "Visual design inspiration" },
              ].map(({ icon: Icon, name, detail }) => (
                <li key={name} className="flex min-w-0 items-start gap-2.5">
                  <Icon size={14} className="mt-0.5 shrink-0 text-sky-400" />
                  <p className="min-w-0 text-xs leading-relaxed"><span className="font-medium text-slate-200">{name}</span><span className="block text-slate-500">{detail}</span></p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-300">Acknowledgements</h3>
            <p className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-slate-400"><Satellite size={14} className="mt-0.5 shrink-0 text-sky-400" /> NASA Space Apps Challenge for the research challenge.</p>
            <p className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-slate-400"><Database size={14} className="mt-0.5 shrink-0 text-sky-400" /> NASA POWER for the environmental research data source.</p>
          </div>

          <div>
            <h3 className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-300">Contact</h3>
            <a href="mailto:bsse-25s-0102@stmu.edu.pk" className="mt-4 flex items-start gap-2.5 break-all text-xs leading-relaxed text-slate-400 transition-colors hover:text-white">
              <Mail size={14} className="mt-0.5 shrink-0 text-sky-400" /> bsse-25s-0102@stmu.edu.pk
            </a>
            <a href="tel:+923410935456" className="mt-3 flex items-center gap-2.5 text-xs leading-relaxed text-slate-400 transition-colors hover:text-white">
              <Phone size={14} className="shrink-0 text-sky-400" /> +92 341 0935456
            </a>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8">
        <div className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-slate-500">
          Flight Hardware (Software)
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">The stack that flies</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {STACK.map((t) => (
            <span
              key={t}
              className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-2 text-[0.76rem] text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <SatelliteSimulationDisclosure />

      {/* Roadmap */}
      <section className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8">
        <div className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-slate-500">
          Flight Plan
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Development Roadmap</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Planned datasets and engineering work are maintained with access requirements and integration status in the Data &amp; Methods reference.
        </p>
        <Link
          href="/data-sources#roadmap"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[0.78rem] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <Database size={14} /> View integration roadmap <ArrowUpRight size={12} />
        </Link>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-5 pt-20 text-center sm:px-8">
        <h2 className="text-3xl font-bold text-white">Want to fly with us?</h2>
        <p className="mx-auto mt-3 max-w-md text-slate-400">
          Judges, researchers, students — we read everything. The platform is open; bring your own question about a changing planet.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/explorer"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition-colors"
          >
            <Rocket size={16} /> Launch Trend Explorer
          </Link>
          <Link
            href="/data-sources"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <FileText size={16} /> See the data
          </Link>
        </div>
      </section>
    </div>
  );
}
