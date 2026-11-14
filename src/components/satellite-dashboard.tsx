"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Activity,
  Battery,
  Box,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  MapPin,
  Minus,
  Orbit,
  Plus,
  Radio,
  RotateCcw,
  Satellite,
  Signal,
  Thermometer,
  Zap,
} from "lucide-react";

const EarthMap = dynamic(() => import("@/components/earth-map"), { ssr: false });

const TELEMETRY_TABS = ["Telemetry", "Attitude", "Thermal", "Power", "Comm"] as const;
type TelemetryTab = (typeof TELEMETRY_TABS)[number];

const TELEMETRY: Record<TelemetryTab, [string, string][]> = {
  Telemetry: [
    ["Altitude (mean)", "542.6 km"],
    ["Velocity", "7.61 km/s"],
    ["Inclination", "98.7°"],
    ["Eccentricity", "0.0012"],
    ["Period", "94.7 min"],
    ["Latitude", "12.634° N"],
    ["Longitude", "45.218° E"],
    ["Ground track rate", "7.42 km/s"],
  ],
  Attitude: [
    ["Roll", "0.12°"],
    ["Pitch", "-0.08°"],
    ["Yaw", "0.03°"],
    ["Angular rate · roll", "0.0002°/s"],
    ["Angular rate · pitch", "-0.0001°/s"],
    ["Angular rate · yaw", "0.0003°/s"],
  ],
  Thermal: [
    ["Payload bay", "18.4°C"],
    ["Solar panel A", "24.1°C"],
    ["Solar panel B", "23.8°C"],
    ["Battery pack", "21.6°C"],
    ["Onboard computer", "31.2°C"],
    ["Thermal state", "Nominal"],
  ],
  Power: [
    ["Solar array", "98%"],
    ["Battery", "86%"],
    ["Bus voltage", "28.4 V"],
    ["Bus current", "4.2 A"],
    ["Charge mode", "Sunlight"],
    ["Power state", "Nominal"],
  ],
  Comm: [
    ["Uplink", "8.402 GHz · S-band"],
    ["Downlink", "8.255 GHz · S-band"],
    ["Signal strength", "45.2 dBm"],
    ["Data rate", "12.6 Mbps"],
    ["Link state", "Locked"],
  ],
};

const PASSES = [
  { aos: "06:37:19", duration: "10m 43s", elevation: "78.3°", status: "Upcoming" },
  { aos: "08:14:52", duration: "10m 35s", elevation: "64.7°", status: "Upcoming" },
  { aos: "13:42:06", duration: "13m 44s", elevation: "82.1°", status: "Scheduled" },
  { aos: "15:19:41", duration: "10m 51s", elevation: "70.4°", status: "Scheduled" },
  { aos: "18:56:24", duration: "12m 08s", elevation: "76.2°", status: "Scheduled" },
  { aos: "20:33:58", duration: "09m 46s", elevation: "58.9°", status: "Scheduled" },
];

const MISSION_STEPS = [
  { name: "Acquisition", time: "06:12", state: "complete" },
  { name: "Tracking", time: "06:15", state: "complete" },
  { name: "Imaging", time: "06:21", state: "active" },
  { name: "Downlink", time: "06:32", state: "pending" },
] as const;

function DataRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-2.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-w-0 items-center justify-between gap-3 text-[0.68rem]">
          <dt className="flex min-w-0 items-center gap-2 text-mist">
            <span className="h-1 w-1 shrink-0 rounded-full bg-cyan/70" />
            <span className="truncate">{label}</span>
          </dt>
          <dd className="shrink-0 font-mono tabular-nums text-ice">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanelHeading({ icon: Icon, children, trailing }: { icon: typeof Activity; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-line px-3.5 py-3">
      <h2 className="flex min-w-0 items-center gap-2 font-display text-[0.76rem] font-semibold text-ice">
        <Icon size={14} className="shrink-0 text-cyan" />
        <span className="truncate">{children}</span>
      </h2>
      {trailing}
    </div>
  );
}

export default function SatelliteDashboard() {
  const [telemetryTab, setTelemetryTab] = useState<TelemetryTab>("Telemetry");
  const [zoom, setZoom] = useState(1);
  const [threeDimensional, setThreeDimensional] = useState(true);
  const [imageryTab, setImageryTab] = useState("Live Imagery");
  const [showAllPasses, setShowAllPasses] = useState(false);

  const adjustZoom = (change: number) => setZoom((current) => Math.min(1.2, Math.max(0.82, current + change)));

  return (
    <section className="mx-auto min-h-[calc(100vh-7rem)] max-w-[1680px] px-3 py-4 sm:px-5 lg:px-7">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan/20 bg-cyan/5 text-cyan">
            <Satellite size={21} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-wide text-ice sm:text-2xl">ORBIT-02</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/25 bg-leaf/10 px-2 py-0.5 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-leaf">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf" /> Simulation
              </span>
            </div>
            <p className="mt-0.5 truncate text-[0.65rem] text-mist">Earth observation · Sun-synchronous · 98.7° inclination</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[0.58rem] text-mist">
          <span><span className="text-faint">NORAD ID</span> <b className="ml-1 font-medium text-ice">43218</b></span>
          <span><span className="text-faint">COSPAR</span> <b className="ml-1 font-medium text-ice">2022-058A</b></span>
          <span><span className="text-faint">LAUNCH</span> <b className="ml-1 font-medium text-ice">2022-11-14</b></span>
          <span className="inline-flex items-center gap-1.5 text-cyan"><Clock3 size={11} /> 06:24:36 UTC</span>
        </div>
      </div>

      <p className="mb-3 flex items-center gap-2 border-l-2 border-amber/50 pl-2.5 font-mono text-[0.55rem] text-faint">
        <Activity size={12} className="text-amber" /> Interface preview · Orbital and mission readings are simulated, not a live spacecraft feed.
      </p>

      <div className="grid gap-3 xl:grid-cols-12">
        <section className="relative min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#061326] xl:col-span-7" aria-label="Orbital view">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_55%_48%,rgba(16,54,91,0.68),rgba(4,12,26,0.15)_58%,rgba(4,10,22,0.85))]" />
          <div className="relative z-10 flex min-h-10 items-center justify-between gap-3 border-b border-line px-3.5 py-2">
            <span className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-mist"><Orbit size={13} className="text-cyan" /> Orbital view <span className="text-faint">·</span> 542.6 km</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-teal"><span className="h-1.5 w-1.5 rounded-full bg-teal pulse-dot" /> Ground station pass</span>
          </div>

          <div className="relative min-h-[390px] overflow-hidden sm:min-h-[430px]">
            <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(141,197,225,.38) .7px, transparent .7px)", backgroundSize: "31px 31px" }} />
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <div className="absolute h-[min(82vw,410px)] w-[min(82vw,410px)] rounded-full bg-cyan/10 blur-3xl" />
              <svg className="absolute h-[min(96vw,540px)] w-[min(96vw,540px)] -rotate-[23deg]" viewBox="0 0 600 600" aria-hidden="true">
                <ellipse cx="300" cy="300" rx="280" ry="142" fill="none" stroke="rgba(66,217,232,.55)" strokeWidth="1.5" strokeDasharray="5 8" />
              </svg>
              <motion.div
                className="relative z-10 h-[min(62vw,320px)] w-[min(62vw,320px)] max-h-[320px] max-w-[320px] overflow-hidden rounded-full border border-cyan/35 shadow-[0_0_55px_rgba(40,168,224,0.28)]"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: zoom }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ perspective: "800px", transformStyle: "preserve-3d" }}
                aria-label="Illustration of Earth from orbit"
              >
                <div
                  className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 ${threeDimensional ? "scale-110" : "scale-100"}`}
                  style={{ backgroundImage: "url(https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002130/GSFC_20171208_Archive_e002130~large.jpg)" }}
                />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(115deg,rgba(0,7,18,.72),transparent_35%,rgba(0,11,26,.1)_64%,rgba(0,5,14,.62))]" />
                <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-r from-transparent to-[#020813]/55" />
              </motion.div>
              <motion.div
                className="absolute z-20 h-[min(88vw,485px)] w-[min(88vw,485px)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                aria-hidden="true"
              >
                <div className="absolute left-1/2 top-[7%] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] text-ice drop-shadow-[0_0_12px_rgba(66,217,232,.9)]">
                  <Satellite size={30} />
                </div>
              </motion.div>
            </div>

            <div className="absolute left-3 top-3 z-20 w-40 rounded-md border border-white/10 bg-[#071421]/85 p-3 backdrop-blur-md sm:w-44">
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-cyan"><Activity size={12} /> Next pass</div>
              <DataRows rows={[["AOS", "06:37:19 UTC"], ["LOS", "06:48:02 UTC"], ["Duration", "10m 43s"], ["Max elevation", "78.3°"]]} />
            </div>

            <div className="absolute right-3 top-3 z-20 w-36 rounded-md border border-white/10 bg-[#071421]/85 p-3 backdrop-blur-md sm:w-40">
              <div className="mb-2 font-display text-xs font-semibold text-ice">ORBIT-02</div>
              <DataRows rows={[["Altitude", "542.6 km"], ["Velocity", "7.61 km/s"], ["Inclination", "98.7°"]]} />
            </div>

            <div className="absolute bottom-3 left-3 z-20 w-[min(48%,190px)] overflow-hidden rounded-md border border-white/10 bg-[#071421]/90 p-2.5 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-mist"><MapPin size={11} className="text-cyan" /> Ground track</div>
              <div className="relative h-[86px] overflow-hidden rounded border border-line bg-[#081b2a]">
                <div className="absolute inset-0 bg-cover bg-center opacity-40 invert" style={{ backgroundImage: "url(https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg)" }} />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 180 86" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M-8 66 C35 61 39 19 75 28 S128 70 188 13" fill="none" stroke="#42d9e8" strokeWidth="1.5" strokeDasharray="4 4" />
                </svg>
                <span className="absolute left-[57%] top-[39%] h-2 w-2 rounded-full bg-teal shadow-[0_0_0_4px_rgba(37,198,178,.18)]" />
              </div>
              <div className="mt-1.5 flex justify-between gap-2 font-mono text-[0.48rem] text-mist"><span>12.634° N</span><span>45.218° E</span></div>
            </div>

            <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5">
              <button onClick={() => adjustZoom(0.08)} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-[#071421]/90 text-mist backdrop-blur hover:border-cyan/45 hover:text-cyan" aria-label="Zoom in" title="Zoom in"><Plus size={15} /></button>
              <button onClick={() => adjustZoom(-0.08)} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-[#071421]/90 text-mist backdrop-blur hover:border-cyan/45 hover:text-cyan" aria-label="Zoom out" title="Zoom out"><Minus size={15} /></button>
              <button onClick={() => setThreeDimensional((value) => !value)} className={`mt-1 grid h-8 w-8 place-items-center rounded border bg-[#071421]/90 backdrop-blur transition-colors ${threeDimensional ? "border-cyan/40 text-cyan" : "border-white/10 text-mist hover:text-cyan"}`} aria-label={threeDimensional ? "Switch to flat globe view" : "Switch to 3D globe view"} title={threeDimensional ? "3D view on" : "3D view off"}><Box size={15} /></button>
              <button onClick={() => { setZoom(1); setThreeDimensional(true); }} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-[#071421]/90 text-mist backdrop-blur hover:border-cyan/45 hover:text-cyan" aria-label="Reset globe view" title="Reset view"><RotateCcw size={14} /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3.5 py-2 font-mono text-[0.5rem] uppercase tracking-[0.08em] text-faint">
            <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-teal" /> Current position</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-px w-3 bg-cyan" /> Ground track</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Coverage area</span>
            <span className="ml-auto text-faint">Illustrative orbital view</span>
          </div>
        </section>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-2">
          <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95 sm:col-span-2" aria-label="Satellite telemetry">
            <div className="flex min-h-10 items-center gap-1 overflow-x-auto border-b border-line px-2">
              {TELEMETRY_TABS.map((tab) => (
                <button key={tab} onClick={() => setTelemetryTab(tab)} className={`relative shrink-0 px-2.5 py-3 font-mono text-[0.54rem] transition-colors ${telemetryTab === tab ? "text-cyan" : "text-mist hover:text-ice"}`} aria-pressed={telemetryTab === tab}>
                  {tab}
                  {telemetryTab === tab && <span className="absolute inset-x-1 bottom-0 h-0.5 bg-cyan" />}
                </button>
              ))}
            </div>
            <div className="grid gap-x-5 gap-y-1 px-3.5 py-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DataRows rows={TELEMETRY[telemetryTab]} />
              {telemetryTab === "Telemetry" && <DataRows rows={[["Roll", "0.12°"], ["Pitch", "-0.08°"], ["Yaw", "0.03°"], ["Angular rate", "0.0002°/s"]]} />}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95 sm:col-span-2" aria-label="Communications">
            <PanelHeading icon={Radio} trailing={<span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-teal">Link locked</span>}>Communication</PanelHeading>
            <div className="grid gap-x-6 gap-y-2 px-3.5 py-3 sm:grid-cols-2">
              <DataRows rows={[["Uplink", "8.402 GHz · S-band"], ["Downlink", "8.255 GHz · S-band"], ["Signal strength", "45.2 dBm"]]} />
              <DataRows rows={[["Data rate", "12.6 Mbps"], ["Link margin", "8.4 dB"], ["Packet loss", "0.02%"]]} />
            </div>
            <div className="flex gap-2 border-t border-line px-3.5 py-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
              <Signal size={12} className="text-teal" /> S-band · secure link <span className="ml-auto text-teal">Nominal</span>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95" aria-label="Power system">
            <PanelHeading icon={Zap}>Power system</PanelHeading>
            <div className="space-y-3 px-3.5 py-3">
              <div className="flex items-center justify-between text-[0.65rem]"><span className="flex items-center gap-2 text-mist"><Battery size={13} className="text-cyan" /> Battery</span><span className="font-mono text-ice">86%</span></div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[86%] rounded-full bg-gradient-to-r from-cyan to-teal" /></div>
              <div className="flex items-center justify-between text-[0.65rem]"><span className="text-mist">Solar array</span><span className="font-mono text-ice">98%</span></div>
              <div className="flex justify-between font-mono text-[0.53rem] text-faint"><span>28.4 V</span><span>4.2 A</span></div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95" aria-label="Thermal system">
            <PanelHeading icon={Thermometer}>Thermal state</PanelHeading>
            <div className="grid grid-cols-2 gap-3 px-3.5 py-3">
              <div><p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">Payload bay</p><p className="mt-1 font-display text-lg font-semibold tabular-nums text-ice">18.4<span className="ml-0.5 text-xs text-mist">°C</span></p></div>
              <div><p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">Bus temp</p><p className="mt-1 font-display text-lg font-semibold tabular-nums text-ice">31.2<span className="ml-0.5 text-xs text-mist">°C</span></p></div>
              <span className="col-span-2 inline-flex items-center gap-1.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-teal"><Check size={11} /> All sensors nominal</span>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-12">
        <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95 xl:col-span-3" aria-label="Upcoming ground station passes">
          <PanelHeading icon={Clock3} trailing={<button onClick={() => setShowAllPasses((value) => !value)} className="inline-flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-cyan hover:text-ice" aria-expanded={showAllPasses}>{showAllPasses ? "Show less" : "View all"} <ChevronRight size={12} className={showAllPasses ? "rotate-90" : ""} /></button>}>Ground station passes</PanelHeading>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[370px] text-left">
              <thead className="font-mono text-[0.48rem] uppercase tracking-[0.1em] text-faint"><tr><th className="px-3 py-2 font-normal">AOS</th><th className="px-2 py-2 font-normal">Duration</th><th className="px-2 py-2 font-normal">Max elev.</th><th className="px-3 py-2 text-right font-normal">Status</th></tr></thead>
              <tbody>{PASSES.slice(0, showAllPasses ? PASSES.length : 4).map((pass) => <tr key={pass.aos} className="border-t border-line text-[0.58rem]"><td className="px-3 py-2 font-mono tabular-nums text-ice">{pass.aos}</td><td className="px-2 py-2 font-mono text-mist">{pass.duration}</td><td className="px-2 py-2 font-mono text-mist">{pass.elevation}</td><td className="px-3 py-2 text-right"><span className={`inline-flex items-center gap-1 font-mono text-[0.49rem] ${pass.status === "Upcoming" ? "text-teal" : "text-mist"}`}><i className={`h-1.5 w-1.5 rounded-full ${pass.status === "Upcoming" ? "bg-teal" : "bg-slate-500"}`} />{pass.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95 xl:col-span-5" aria-label="Earth imagery preview">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3.5">
            <div className="flex items-center gap-1">
              {["Live Imagery", "Recent Images", "Analysis"].map((tab) => <button key={tab} onClick={() => setImageryTab(tab)} className={`relative px-2.5 py-3 font-mono text-[0.54rem] transition-colors ${imageryTab === tab ? "text-cyan" : "text-mist hover:text-ice"}`} aria-pressed={imageryTab === tab}>{tab}{imageryTab === tab && <span className="absolute inset-x-1 bottom-0 h-0.5 bg-cyan" />}</button>)}
            </div>
            <Camera size={14} className="shrink-0 text-faint" />
          </div>
          <div className="relative h-[178px] overflow-hidden sm:h-[194px]">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002130/GSFC_20171208_Archive_e002130~medium.jpg)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04101e]/95 via-[#04101e]/5 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <div><p className="font-display text-xs font-semibold text-white">{imageryTab === "Analysis" ? "Surface classification" : "Eastern Mediterranean · Pass 1842"}</p><p className="mt-1 font-mono text-[0.5rem] text-slate-200/75">{imageryTab === "Recent Images" ? "Previous capture · 05:46 UTC" : "Optical camera · captured 06:21:08 UTC · simulated feed"}</p></div>
              <button onClick={() => setImageryTab("Analysis")} aria-label="Analyze current image" title="Analyze current image" className="grid h-8 w-8 shrink-0 place-items-center rounded border border-white/20 bg-[#061326]/70 text-white backdrop-blur hover:border-cyan/60 hover:text-cyan"><ChevronRight size={15} /></button>
            </div>
            <span className="absolute right-3 top-3 rounded-sm border border-white/20 bg-[#061326]/70 px-2 py-1 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-white/85">{imageryTab === "Analysis" ? "L2 product" : "PAN · 1.2 m"}</span>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-line-strong bg-[#08182A]/95 xl:col-span-4" aria-label="Mission status and payloads">
          <PanelHeading icon={Compass}>Mission status</PanelHeading>
          <ol className="grid grid-cols-4 px-3 py-3">
            {MISSION_STEPS.map((step, index) => (
              <li key={step.name} className="relative min-w-0 text-center">
                {index < MISSION_STEPS.length - 1 && <span className={`absolute left-1/2 top-[7px] h-px w-full ${step.state === "complete" ? "bg-teal" : "bg-white/15"}`} />}
                <span className={`relative mx-auto grid h-3.5 w-3.5 place-items-center rounded-full border ${step.state === "complete" ? "border-teal bg-teal text-[#061326]" : step.state === "active" ? "border-cyan bg-cyan/20 text-cyan" : "border-slate-600 bg-[#08182A] text-slate-500"}`}>
                  {step.state === "complete" ? <Check size={9} /> : step.state === "active" ? <span className="h-1 w-1 rounded-full bg-cyan" /> : <span className="h-1 w-1 rounded-full bg-slate-500" />}
                </span>
                <p className={`mt-1.5 truncate text-[0.54rem] font-medium ${step.state === "pending" ? "text-faint" : "text-ice"}`}>{step.name}</p>
                <p className="mt-0.5 font-mono text-[0.48rem] text-faint">{step.time} UTC</p>
              </li>
            ))}
          </ol>
          <div className="border-t border-line px-3.5 py-2.5">
            <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-display text-[0.68rem] font-semibold text-ice">Payloads &amp; sensors</h3><span className="font-mono text-[0.48rem] uppercase tracking-[0.1em] text-teal">2 active</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-2"><Camera size={13} className="shrink-0 text-cyan" /><span className="min-w-0 flex-1 truncate text-[0.58rem] text-mist">Optical camera (PAN)</span><span className="font-mono text-[0.46rem] text-teal">ACTIVE</span></div>
              <div className="flex min-w-0 items-center gap-2"><Activity size={13} className="shrink-0 text-cyan" /><span className="min-w-0 flex-1 truncate text-[0.58rem] text-mist">Multispectral (MS)</span><span className="font-mono text-[0.46rem] text-teal">ACTIVE</span></div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 font-mono text-[0.48rem] uppercase tracking-[0.1em] text-faint">
        <span>ORBIT-02 · Interface simulation · Not affiliated with or endorsed by NASA</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Sample data only</span>
      </div>
    </section>
  );
}