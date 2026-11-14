"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

function Counter({ target, suffix = "", duration = 1.6 }: { target: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(2, -9 * p);
      setValue(Math.round(target * (p < 1 ? eased : 1) * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {Number.isInteger(target) ? Math.round(value).toLocaleString() : value.toFixed(1)}{suffix}
    </span>
  );
}

const STATS: { value: number; suffix: string; label: string }[] = [
  { value: 1984, suffix: "", label: "First observation year in NASA POWER" },
  { value: 7, suffix: "", label: "NASA parameters ready to analyze" },
  { value: 3, suffix: "", label: "Trend tests — OLS, Theil–Sen, Mann–Kendall" },
  { value: 100, suffix: "%", label: "Open data, open methods, no black boxes" },
];

export default function StatBand() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="bg-deep px-5 py-6 text-center">
          <div className="font-display text-2xl font-bold text-cyan sm:text-3xl">
            <Counter target={s.value} suffix={s.suffix} />
          </div>
          <div className="mt-1.5 text-[0.62rem] leading-snug text-mist">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
