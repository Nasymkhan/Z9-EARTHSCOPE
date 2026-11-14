"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush,
  Legend,
} from "recharts";

export interface ChartPoint {
  t: string;
  year: number;
  v: number | null;
  fit: number;
}

interface Props {
  series: { t: string; year: number; v: number }[];
  slopePerYear: number;
  intercept: number;
  unit: string;
  color: string;
  height?: number;
  showBrush?: boolean;
}

const yearTick = (y: number) => String(Math.floor(y));

export default function TimeSeriesChart({ series, slopePerYear, intercept, unit, color, height = 380, showBrush = true }: Props) {
  // Decimate display density (statistics always use the full series)
  const data: ChartPoint[] = useMemo(() => {
    const stride = Math.max(1, Math.ceil(series.length / 1500));
    const out: ChartPoint[] = [];
    for (let i = 0; i < series.length; i += stride) {
      const p = series[i];
      out.push({ t: p.t, year: p.year, v: p.v, fit: slopePerYear * p.year + intercept });
    }
    const last = series[series.length - 1];
    const lastFit = slopePerYear * last.year + intercept;
    if (out.length && out[out.length - 1].t !== last.t) out.push({ t: last.t, year: last.year, v: last.v, fit: lastFit });
    return out;
  }, [series, slopePerYear, intercept]);

  const mean = useMemo(
    () => (series.length ? series.reduce((a, b) => a + b.v, 0) / series.length : 0),
    [series]
  );

  return (
    <div className="w-full" role="img" aria-label={`Time series chart of measurements in ${unit} with least-squares trend line`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(166,181,199,0.12)" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={yearTick}
            stroke="#6B7E93"
            tick={{ fill: "#A6B5C7", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(166,181,199,0.22)" }}
            minTickGap={28}
          />
          <YAxis
            stroke="#6B7E93"
            tick={{ fill: "#A6B5C7", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1))}
          />
          <Tooltip
            cursor={{ stroke: "rgba(15,157,154,0.5)", strokeDasharray: "4 4" }}
            contentStyle={{
              background: "#10243A",
              border: "1px solid #334B64",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "var(--font-jetbrains)",
              boxShadow: "0 12px 34px rgba(0,0,0,0.55)",
            }}
            labelStyle={{ color: "#65C7C4", marginBottom: 4 }}
            labelFormatter={(_value, payload) => {
              const p = payload?.[0]?.payload as ChartPoint | undefined;
              return p?.t ?? "";
            }}
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value);
              const formatted = Number.isFinite(v) ? v.toFixed(2) : "—";
              if (name === "fit") return [`${formatted} ${unit}`, "Trend line (OLS)"];
              return [`${formatted} ${unit}`, "Observation"];
            }}
          />
          <ReferenceLine
            y={mean}
            stroke="rgba(157,180,212,0.35)"
            strokeDasharray="3 6"
            label={{ value: "period mean", position: "insideTopRight", fill: "#6B7E93", fontSize: 9, fontFamily: "var(--font-plex-mono)" }}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
            name="v"
            strokeOpacity={0.9}
          />
          <Line
            type="linear"
            dataKey="fit"
            stroke="#0F9D9A"
            strokeWidth={2}
            strokeDasharray="7 5"
            dot={false}
            isAnimationActive={false}
            name="fit"
          />
          {showBrush && data.length > 60 && (
            <Brush
              dataKey="year"
              height={26}
              stroke="#223a66"
              fill="#071426"
              travellerWidth={8}
              tickFormatter={yearTick}
              alwaysShowText={false}
            >
              <ComposedChart>
                <Line type="monotone" dataKey="v" stroke="#3D74A8" strokeWidth={1} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </Brush>
          )}
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 11, paddingBottom: 6 }}
            content={() => (
              <div className="flex items-center justify-end gap-4 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mist">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-[2px] w-5" style={{ background: color }} /> Observation
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-[2px] w-5 border-t-2 border-dashed border-cyan" /> OLS trend
                </span>
              </div>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
