"use client";

import { useState } from "react";
import { ChevronDown, Satellite } from "lucide-react";
import SatelliteDashboard from "@/components/satellite-dashboard";

export default function SatelliteSimulationDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <details
      id="orbit-02"
      className="orbit-simulation mx-auto mt-14 max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg border border-line bg-[#0b1c13] p-4 transition-colors hover:border-cyan/35 sm:p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan/20 bg-cyan/5 text-cyan"><Satellite size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[0.55rem] uppercase tracking-[0.18em] text-cyan">Interactive simulation</span>
          <span className="mt-1 block font-display text-base font-semibold text-ice">ORBIT-02 · Satellite operations</span>
          <span className="mt-1 block text-[0.72rem] text-mist">Illustrative orbital telemetry, ground passes, and Earth imagery</span>
        </span>
        <ChevronDown className="orbit-simulation-chevron shrink-0 text-cyan transition-transform" size={18} />
      </summary>
      {open && <div className="mt-3 overflow-hidden rounded-lg border border-line"><SatelliteDashboard /></div>}
    </details>
  );
}