"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getVariable, VARIABLES, type Resolution } from "@/lib/variables";

interface RelationshipResponse {
  variables: {
    x: { code: string; name: string; unit: string };
    y: { code: string; name: string; unit: string };
  };
  location: { name: string; latitude: number; longitude: number };
  period: { start: string; end: string; resolution: Resolution };
  source: string;
  fetchedAt: string;
  matchedObservations: number;
  expectedSlots: number;
  pearson: number | null;
  spearman: number | null;
  chartPoints: { t: string; x: number; y: number }[];
  note: string;
}

interface Props {
  variable: string;
  latitude: number;
  longitude: number;
  locationName: string;
  startDate: string;
  endDate: string;
  resolution: Resolution;
}

const fmt = (value: number | null) => value === null ? "n/a" : value.toFixed(3);

export default function RelationshipAnalyzer({
  variable,
  latitude,
  longitude,
  locationName,
  startDate,
  endDate,
  resolution,
}: Props) {
  const [comparedVariable, setComparedVariable] = useState(() => VARIABLES.find((item) => item.code !== variable)?.code ?? "T2M_MAX");
  const [result, setResult] = useState<RelationshipResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xDefinition = getVariable(variable);
  const availableY = VARIABLES.filter((item) => item.code !== variable);
  const selectedY = availableY.find((item) => item.code === comparedVariable) ?? availableY[0];

  const analyze = async () => {
    if (!selectedY) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variableX: variable,
          variableY: selectedY.code,
          latitude,
          longitude,
          locationName,
          startDate,
          endDate,
          resolution,
        }),
      });
      const data = await response.json() as RelationshipResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? `Relationship analysis failed (HTTP ${response.status}).`);
      setResult(data);
    } catch (cause) {
      setError((cause as Error).message ?? "Could not calculate this relationship.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel overflow-hidden" aria-labelledby="relationship-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <p className="kicker">Earth system relationship</p>
          <h2 id="relationship-title" className="mt-1 font-display text-lg font-semibold text-ice">Investigate two variables</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mist">
            Compare concurrent NASA POWER observations at this grid cell. Seasonal cycles and long-term trends may contribute to a relationship.
          </p>
        </div>
        <Activity size={20} className="mt-1 shrink-0 text-cyan" aria-hidden="true" />
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="label">Variable X</span>
            <div className="field flex items-center justify-between gap-3">
              <span className="truncate text-ice">{xDefinition?.name ?? variable}</span>
              <span className="shrink-0 font-mono text-xs text-faint">{xDefinition?.unit}</span>
            </div>
          </label>
          <label className="min-w-0">
            <span className="label">Variable Y</span>
            <select
              className="field"
              value={selectedY?.code ?? ""}
              onChange={(event) => setComparedVariable(event.target.value)}
              aria-label="Second environmental variable"
            >
              {availableY.map((item) => <option key={item.code} value={item.code}>{item.name} · {item.unit}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="btn btn-primary min-w-48" onClick={analyze} disabled={loading || !selectedY} aria-busy={loading}>
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
          {loading ? "Analyzing" : "Analyze relationship"}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-4 flex items-start gap-2 rounded-md border border-coral/35 bg-coral/8 px-3 py-2.5 text-sm text-coral sm:mx-5" role="alert">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result ? (
        <div className="border-t border-line">
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <div>
              <p className="label">Pearson r</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-ice">{fmt(result.pearson)}</p>
              <p className="text-xs text-faint">Linear association</p>
            </div>
            <div>
              <p className="label">Spearman ρ</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-ice">{fmt(result.spearman)}</p>
              <p className="text-xs text-faint">Rank association</p>
            </div>
            <div>
              <p className="label">Matched observations</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-ice">{result.matchedObservations.toLocaleString()}</p>
              <p className="text-xs text-faint">of {result.expectedSlots.toLocaleString()} expected time steps</p>
            </div>
          </div>

          <div className="h-72 border-t border-line px-2 py-4 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 8 }}>
                <CartesianGrid stroke="#203750" strokeDasharray="3 5" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={result.variables.x.name}
                  unit={` ${result.variables.x.unit}`}
                  tick={{ fill: "#A6B5C7", fontSize: 11 }}
                  tickLine={{ stroke: "#64748B" }}
                  axisLine={{ stroke: "#334B64" }}
                  label={{ value: result.variables.x.name, position: "insideBottom", offset: -8, fill: "#A6B5C7", fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={result.variables.y.name}
                  unit={` ${result.variables.y.unit}`}
                  tick={{ fill: "#A6B5C7", fontSize: 11 }}
                  tickLine={{ stroke: "#64748B" }}
                  axisLine={{ stroke: "#334B64" }}
                  width={72}
                />
                <Tooltip
                  cursor={{ stroke: "#64748B", strokeDasharray: "4 4" }}
                  contentStyle={{ background: "#10243A", border: "1px solid #334B64", borderRadius: 6, color: "#F1F5F9" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.t ?? "Observation"}
                />
                <Scatter name="Matched observations" data={result.chartPoints} fill="#0F9D9A" fillOpacity={0.68} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-3 text-xs text-mist sm:px-5">
            <span>{result.location.name} · {result.location.latitude.toFixed(4)}°, {result.location.longitude.toFixed(4)}° · {result.period.start} to {result.period.end} · {result.period.resolution}</span>
            <span>{result.source} · Retrieved {new Date(result.fetchedAt).toISOString().slice(0, 10)}</span>
          </div>
          <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-faint sm:px-5">{result.note}</p>
        </div>
      ) : (
        <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-faint sm:px-5">
          Choose a second variable to compare measurements over the same dates. Only exact timestamp matches are included.
        </p>
      )}
    </section>
  );
}
