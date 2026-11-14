"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { detectSeasonalAnomalies, mean } from "@/lib/stats";
import { buildImpactContext } from "@/lib/explain";
import { getVariable } from "@/lib/variables";
import type { StoredAnalysisPayload, StoredSeriesPoint } from "@/db/schema";

export default function EnvironmentalInsights({
  payload,
  series,
}: {
  payload: StoredAnalysisPayload;
  series: StoredSeriesPoint[];
}) {
  const anomalyResult = useMemo(() => detectSeasonalAnomalies(series), [series]);
  const variable = getVariable(payload.variable);
  const periodYears = series.length > 1 ? Math.max(0, series.at(-1)!.year - series[0].year) : 0;
  const estimatedChange = payload.senSlopePerYear * periodYears;
  const baselineValues = useMemo(() => {
    if (!series.length) return [];
    const baselineEnd = series[0].year + 1;
    return series.filter((point) => point.year <= baselineEnd).map((point) => point.v);
  }, [series]);
  const baselineMean = mean(baselineValues);
  const relativeChange = variable && variable.category !== "Temperature" && Number.isFinite(baselineMean) && Math.abs(baselineMean) > 1e-8
    ? (estimatedChange / Math.abs(baselineMean)) * 100
    : null;

  return (
    <section className="panel overflow-hidden" aria-label="Environmental anomaly and impact context">
      <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-deep text-amber">
              <AlertTriangle size={17} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="kicker">Historical diagnostics</p>
              <h3 className="mt-1 font-display text-base font-semibold text-ice">Environmental anomaly scan</h3>
            </div>
          </div>

          {anomalyResult.available ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-mist">
                {anomalyResult.anomalies.length
                  ? `${anomalyResult.anomalies.length} observation${anomalyResult.anomalies.length === 1 ? "" : "s"} crossed the seasonal robust-z threshold.`
                  : "No observations crossed the seasonal robust-z threshold in this period."}
              </p>
              {anomalyResult.anomalies.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {anomalyResult.anomalies.slice(0, 5).map((item) => (
                    <li key={item.t} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
                      <span className="font-mono text-ice">{item.t}</span>
                      <span className="tabular-nums text-mist">
                        {item.value.toFixed(2)} {payload.unit}
                        <span className="ml-2 text-amber">z {item.robustZ > 0 ? "+" : ""}{item.robustZ.toFixed(1)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-mist">
              Seasonal baseline is insufficient. At least five observations for six calendar months are required to score anomalies.
            </p>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-faint">
            <Clock3 size={14} className="mt-0.5 shrink-0" />
            Trend-adjusted, same-calendar-month median/MAD; threshold |robust z| ≥ {anomalyResult.threshold}. Flags are diagnostics, not confirmed disasters.
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-deep text-cyan">
              {payload.significant ? <CheckCircle2 size={17} aria-hidden="true" /> : <ShieldAlert size={17} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="kicker">Evidence in context</p>
              <h3 className="mt-1 font-display text-base font-semibold text-ice">Potential environmental relevance</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-mist">{buildImpactContext(payload.variable, payload.verdict)}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-3">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-faint">Estimated change across period</span>
            <strong className="font-display text-lg font-semibold tabular-nums text-ice">
              {estimatedChange >= 0 ? "+" : ""}{estimatedChange.toFixed(3)} {payload.unit}
            </strong>
            {relativeChange !== null && (
              <span className="font-mono text-xs tabular-nums text-mist">{relativeChange >= 0 ? "+" : ""}{relativeChange.toFixed(1)}% of first-year mean</span>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Context only. This grid-cell trend does not establish cause, local exposure, or downstream outcomes. Temperature is shown in native units; percentage change is not meaningful on the Celsius scale.
          </p>
        </div>
      </div>
    </section>
  );
}
