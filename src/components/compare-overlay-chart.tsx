"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

interface SeriesInput {
  name: string;
  color: string;
  series: { t: string; year: number; v: number }[];
}

/** Overlay chart of calendar-year means for two compatible series. */
export default function CompareOverlayChart({ a, b, unit }: { a: SeriesInput; b: SeriesInput; unit: string }) {
  const data = useMemo(() => {
    const agg = (s: SeriesInput["series"]) => {
      const m = new Map<number, { sum: number; n: number }>();
      for (const p of s) {
        const y = Math.floor(p.year);
        const e = m.get(y) ?? { sum: 0, n: 0 };
        e.sum += p.v;
        e.n += 1;
        m.set(y, e);
      }
      return m;
    };
    const ma = agg(a.series), mb = agg(b.series);
    const years = [...new Set([...ma.keys(), ...mb.keys()])].sort((x, y) => x - y);
    return years.map((y) => {
      const ea = ma.get(y), eb = mb.get(y);
      return {
        year: y,
        a: ea ? +(ea.sum / ea.n).toFixed(3) : null,
        b: eb ? +(eb.sum / eb.n).toFixed(3) : null,
      };
    });
  }, [a, b]);

  return (
    <div className="w-full" role="img" aria-label="Overlay of calendar-year mean measurements for the two locations">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(150,200,255,0.07)" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            stroke="#6B7E93"
            tick={{ fill: "#93A4B7", fontSize: 10, fontFamily: "var(--font-plex-mono)" }}
            tickLine={false}
            tickFormatter={(y: number) => String(y)}
          />
          <YAxis
            stroke="#6B7E93"
            tick={{ fill: "#93A4B7", fontSize: 10, fontFamily: "var(--font-plex-mono)" }}
            tickLine={false}
            axisLine={false}
            width={46}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#10263B", border: "1px solid rgba(150,200,255,0.25)",
              borderRadius: 10, fontSize: 11, fontFamily: "var(--font-plex-mono)",
            }}
            cursor={{ stroke: "rgba(62,230,210,0.3)" }}
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value);
              return [Number.isFinite(v) ? `${v.toFixed(2)} ${unit}` : "—", name === "a" ? a.name : b.name];
            }}
          />
          <Line type="monotone" dataKey="a" stroke={a.color} strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls name="a" />
          <Line type="monotone" dataKey="b" stroke={b.color} strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls name="b" />
          <Legend
            verticalAlign="bottom"
            content={() => (
              <div className="flex flex-wrap items-center justify-center gap-5 pt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mist">
                <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-5" style={{ background: a.color }} />{a.name}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-5" style={{ background: b.color }} />{b.name}</span>
                <span className="text-faint">· calendar-year means</span>
              </div>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
