"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

export interface LivePoint {
  t: string;
  year: number;
  v: number;
}

export default function LivePreviewChart({ data, unit, color = "#0F9D9A", height = 150 }: { data: LivePoint[]; unit: string; color?: string; height?: number }) {
  if (data.length < 6) return null;
  const mean = data.reduce((a, b) => a + b.v, 0) / data.length;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: -6 }}>
        <defs>
          <linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(150,200,255,0.06)" vertical={false} />
        <XAxis
          dataKey="year"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(y: number) => String(Math.floor(y))}
          stroke="#6B7E93"
          tick={{ fill: "#93A4B7", fontSize: 9, fontFamily: "var(--font-plex-mono)" }}
          tickLine={false}
          minTickGap={36}
        />
        <YAxis
          stroke="#6B7E93"
          tick={{ fill: "#93A4B7", fontSize: 9, fontFamily: "var(--font-plex-mono)" }}
          tickLine={false}
          axisLine={false}
          width={34}
          domain={["auto", "auto"]}
        />
        <Tooltip
          cursor={{ stroke: "rgba(62,230,210,0.35)" }}
          contentStyle={{
            background: "#10263B", border: "1px solid rgba(150,200,255,0.25)",
            borderRadius: 6, fontSize: 11, fontFamily: "var(--font-plex-mono)",
          }}
          labelFormatter={(_v, payload) => (payload?.[0]?.payload as LivePoint | undefined)?.t ?? ""}
          formatter={(value) => {
            const v = typeof value === "number" ? value : Number(value);
            return [`${Number.isFinite(v) ? v.toFixed(2) : "—"} ${unit}`, "Monthly mean"];
          }}
        />
        <ReferenceLine y={mean} stroke="rgba(255,255,255,0.48)" strokeDasharray="3 6" />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill="url(#liveFill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
