// ============================================================================
// Z9 EarthScope — Scientific Statistical Engine
// Pure TypeScript implementation (no silent dependencies on Python runtime).
//
// Methods
//   • Ordinary least-squares linear regression (slope, intercept, R², SE, CI)
//   • Sen's slope — robust median pairwise slope (Theil–Sen)
//   • Mann–Kendall trend test with tie correction & continuity correction
//   • Seasonal Mann–Kendall (Hirsch & Slack, 1984) grouped by calendar month
//   • Lag-1 residual autocorrelation (independent-errors assumption check)
//   • IQR outlier diagnostics (reported, never silently removed)
//
// All significance claims are threshold-based (configurable α, default 0.05).
// Nothing here asserts causation; trends describe the observed series only.
// ============================================================================

export interface CleanPoint {
  t: string; // label: YYYY-MM-DD (daily) or YYYY-MM (monthly)
  year: number; // decimal year
  v: number;
}

// ---------------------------------------------------------------- special functions

/** Abramowitz & Stegun 7.1.26 erf approximation (|ε| ≤ 1.5e-7) */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function lgamma(z: number): number {
  // Lanczos approximation (g = 7)
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a,b) — Numerical Recipes */
export function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

export function studentTCDF(t: number, df: number): number {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  const ib = ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/** Inverse normal CDF via Acklam's rational approximation */
export function normalQuantile(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469593316837, 0.32246712907004, 2.44513413782195, 3.75440866190742];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// ---------------------------------------------------------------- descriptive helpers

function median(sorted: number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

export function mean(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return xs.length ? s / xs.length : NaN;
}

// ---------------------------------------------------------------- OLS regression

export interface OLSResult {
  slope: number;          // units per year
  intercept: number;
  rSquared: number;
  slopeStdErr: number;    // units per year
  tStat: number;
  pValue: number;         // two-sided
  ciLower: number;        // per year
  ciUpper: number;        // per year
  n: number;
}

export function olsRegress(points: CleanPoint[], alpha: number): OLSResult | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = mean(points.map((p) => p.year));
  const my = mean(points.map((p) => p.v));
  let sxx = 0, sxy = 0;
  for (const p of points) {
    sxx += (p.year - mx) ** 2;
    sxy += (p.year - mx) * (p.v - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const fit = slope * p.year + intercept;
    ssRes += (p.v - fit) ** 2;
    ssTot += (p.v - my) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const df = n - 2;
  const mse = ssRes / df;
  const slopeStdErr = Math.sqrt(mse / sxx);
  const tStat = slopeStdErr > 0 ? slope / slopeStdErr : 0;
  const pValue = 2 * (1 - studentTCDF(Math.abs(tStat), df));
  // t critical via Cornish–Fisher expansion on the normal quantile
  const z = normalQuantile(1 - alpha / 2);
  const tCrit =
    z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2);
  return {
    slope, intercept, rSquared, slopeStdErr, tStat,
    pValue: Math.min(1, Math.max(0, pValue)),
    ciLower: slope - tCrit * slopeStdErr,
    ciUpper: slope + tCrit * slopeStdErr,
    n,
  };
}

// ---------------------------------------------------------------- Sen's slope

export function senSlope(points: CleanPoint[]): number | null {
  const n = points.length;
  if (n < 2) return null;
  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = points[i];
    for (let j = i + 1; j < n; j++) {
      const dx = points[j].year - xi.year;
      if (dx > 0) slopes.push((points[j].v - xi.v) / dx);
    }
  }
  if (!slopes.length) return null;
  slopes.sort((a, b) => a - b);
  return median(slopes);
}

// ---------------------------------------------------------------- Mann–Kendall

export interface MKResult {
  s: number;
  varS: number;
  z: number;
  pValue: number;
  tau: number;
  n: number;
  direction: "increasing" | "decreasing" | "none";
}

function mkOnValues(values: number[]): { s: number; varS: number; n: number } {
  const n = values.length;
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    const vi = values[i];
    for (let j = i + 1; j < n; j++) {
      const d = values[j] - vi;
      s += d > 0 ? 1 : d < 0 ? -1 : 0;
    }
  }
  // tie correction
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let tieSum = 0;
  for (const t of counts.values()) {
    if (t > 1) tieSum += t * (t - 1) * (2 * t + 5);
  }
  const varS = (n * (n - 1) * (2 * n + 5) - tieSum) / 18;
  return { s, varS, n };
}

function zFromS(s: number, varS: number): number {
  if (varS <= 0) return 0;
  const sign = s > 0 ? 1 : s < 0 ? -1 : 0;
  return (s - sign) / Math.sqrt(varS); // continuity correction
}

export function mannKendall(points: CleanPoint[]): MKResult | null {
  const values = points.map((p) => p.v);
  const n = values.length;
  if (n < 8) return null;
  const { s, varS } = mkOnValues(values);
  const z = zFromS(s, varS);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const tau = s / (0.5 * n * (n - 1));
  const direction = s > 0 ? "increasing" : s < 0 ? "decreasing" : "none";
  return { s, varS, z, pValue: Math.min(1, Math.max(0, pValue)), tau, n, direction };
}

/** Seasonal Mann–Kendall (Hirsch & Slack 1984) grouped by calendar month. */
export function seasonalMannKendall(points: CleanPoint[]): (MKResult & { groups: number }) | null {
  const groups = new Map<number, number[]>(); // calendar month (1-12) -> values
  for (const p of points) {
    const m = Number(p.t.slice(5, 7));
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;
    const arr = groups.get(m) ?? [];
    arr.push(p.v);
    groups.set(m, arr);
  }
  const usable = [...groups.values()].filter((g) => g.length >= 3);
  if (usable.length < 4) return null;
  let S = 0, varS = 0, n = 0;
  for (const g of usable) {
    const r = mkOnValues(g);
    S += r.s; varS += r.varS; n += r.n;
  }
  if (varS <= 0 || n < 24) return null;
  const z = zFromS(S, varS);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const pairs = usable.reduce((acc, g) => acc + 0.5 * g.length * (g.length - 1), 0);
  const tau = pairs > 0 ? S / pairs : 0;
  const direction = S > 0 ? "increasing" : S < 0 ? "decreasing" : "none";
  return { s: S, varS, z, pValue: Math.min(1, Math.max(0, pValue)), tau, n, direction, groups: usable.length };
}

// ---------------------------------------------------------------- quality diagnostics

/** Lag-1 Pearson autocorrelation of regression residuals. */
export function lag1Autocorrelation(points: CleanPoint[], slope: number, intercept: number): number | null {
  const n = points.length;
  if (n < 10) return null;
  const residuals = points.map((p) => p.v - (slope * p.year + intercept));
  const m = mean(residuals);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const d = residuals[i] - m;
    den += d * d;
    if (i > 0) num += (residuals[i] - m) * (residuals[i - 1] - m);
  }
  return den > 0 ? num / den : null;
}

export function iqrOutliers(points: CleanPoint[]): number {
  const vs = points.map((p) => p.v).sort((a, b) => a - b);
  if (vs.length < 12) return 0;
  const q1 = quantile(vs, 0.25), q3 = quantile(vs, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  return vs.filter((v) => v < lo || v > hi).length;
}

export interface SeasonalAnomaly {
  t: string;
  value: number;
  baseline: number;
  deviation: number;
  robustZ: number;
  baselineCount: number;
}

export interface SeasonalAnomalyResult {
  available: boolean;
  threshold: number;
  comparableMonths: number;
  anomalies: SeasonalAnomaly[];
}

export function detectSeasonalAnomalies(pointsIn: CleanPoint[], threshold = 3.5): SeasonalAnomalyResult {
  const points = [...pointsIn]
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.v))
    .sort((a, b) => a.t.localeCompare(b.t));
  if (points.length < 24) return { available: false, threshold, comparableMonths: 0, anomalies: [] };

  const trendPoints = points.length > 1500 ? aggregateMonthly(points) : points;
  const trendPerYear = senSlope(trendPoints) ?? 0;
  const groups = new Map<number, { point: CleanPoint; residual: number }[]>();
  for (const point of points) {
    const month = Number(point.t.slice(5, 7));
    if (!Number.isInteger(month) || month < 1 || month > 12) continue;
    const group = groups.get(month) ?? [];
    group.push({ point, residual: point.v - trendPerYear * point.year });
    groups.set(month, group);
  }

  const baselines = new Map<number, { center: number; mad: number; count: number }>();
  for (const [month, group] of groups) {
    if (group.length < 5) continue;
    const residuals = group.map((item) => item.residual).sort((a, b) => a - b);
    const center = median(residuals);
    const deviations = residuals.map((value) => Math.abs(value - center)).sort((a, b) => a - b);
    const mad = median(deviations);
    if (mad > 0) baselines.set(month, { center, mad, count: group.length });
  }

  if (baselines.size < 6) return { available: false, threshold, comparableMonths: baselines.size, anomalies: [] };

  const anomalies: SeasonalAnomaly[] = [];
  for (const [month, group] of groups) {
    const baseline = baselines.get(month);
    if (!baseline) continue;
    for (const { point, residual } of group) {
      const robustZ = 0.6745 * (residual - baseline.center) / baseline.mad;
      if (Math.abs(robustZ) < threshold) continue;
      const baselineValue = baseline.center + trendPerYear * point.year;
      anomalies.push({
        t: point.t,
        value: point.v,
        baseline: baselineValue,
        deviation: point.v - baselineValue,
        robustZ,
        baselineCount: baseline.count,
      });
    }
  }

  return {
    available: true,
    threshold,
    comparableMonths: baselines.size,
    anomalies: anomalies.sort((a, b) => Math.abs(b.robustZ) - Math.abs(a.robustZ)),
  };
}

function averageRanks(values: number[]): number[] {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(values.length);
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end++;
    const rank = (start + 1 + end) / 2;
    for (let index = start; index < end; index++) ranks[sorted[index].index] = rank;
    start = end;
  }
  return ranks;
}

export function pearsonCorrelation(xsIn: number[], ysIn: number[]): number | null {
  const pairs = xsIn.slice(0, Math.min(xsIn.length, ysIn.length))
    .map((x, index) => ({ x, y: ysIn[index] }))
    .filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));
  if (pairs.length < 3) return null;
  const xMean = mean(pairs.map((pair) => pair.x));
  const yMean = mean(pairs.map((pair) => pair.y));
  let covariance = 0, xVariance = 0, yVariance = 0;
  for (const pair of pairs) {
    const dx = pair.x - xMean;
    const dy = pair.y - yMean;
    covariance += dx * dy;
    xVariance += dx * dx;
    yVariance += dy * dy;
  }
  if (xVariance === 0 || yVariance === 0) return null;
  return Math.max(-1, Math.min(1, covariance / Math.sqrt(xVariance * yVariance)));
}

export function spearmanCorrelation(xs: number[], ys: number[]): number | null {
  const length = Math.min(xs.length, ys.length);
  const valid = Array.from({ length }, (_, index) => ({ x: xs[index], y: ys[index] }))
    .filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));
  if (valid.length < 3) return null;
  return pearsonCorrelation(
    averageRanks(valid.map((pair) => pair.x)),
    averageRanks(valid.map((pair) => pair.y))
  );
}

/** Aggregate daily-type series to monthly means (for robust Sen/MK on long runs). */
export function aggregateMonthly(points: CleanPoint[]): CleanPoint[] {
  const map = new Map<string, { sum: number; n: number; year: number; t: string }>();
  for (const p of points) {
    const key = p.t.slice(0, 7);
    const e = map.get(key);
    if (e) { e.sum += p.v; e.n += 1; }
    else map.set(key, { sum: p.v, n: 1, year: p.year, t: key });
  }
  return [...map.values()]
    .sort((a, b) => (a.t < b.t ? -1 : 1))
    .map(({ sum, n, year, t }) => ({ t, year, v: sum / n }));
}

export function expectedCalendarSlots(start: string, end: string, resolution: "daily" | "monthly"): number {
  const ms = 86400000;
  const s = Date.parse(start.length === 7 ? `${start}-01T00:00:00Z` : `${start}T00:00:00Z`);
  const e = Date.parse(end.length === 7 ? `${end}-01T00:00:00Z` : `${end}T00:00:00Z`);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 0;
  if (resolution === "daily") return Math.floor((e - s) / ms) + 1;
  const d = new Date(s);
  const de = new Date(e);
  return (de.getUTCFullYear() - d.getUTCFullYear()) * 12 + (de.getUTCMonth() - d.getUTCMonth()) + 1;
}

export function isoToDecimalYear(t: string): number {
  const ms = Date.parse(t.length === 7 ? `${t}-15T00:00:00Z` : `${t}T00:00:00Z`);
  return 1970 + ms / (365.25 * 86400000);
}

// ---------------------------------------------------------------- top-level analysis

export interface AnalysisCore {
  nObs: number;
  nExpected: number;
  coverage: number;
  nMissing: number;
  nOutliers: number;
  lag1Autocorr: number | null;
  slopePerYear: number;
  slopePerDecade: number;
  senSlopePerYear: number;
  senSlopePerDecade: number;
  intercept: number;
  rSquared: number;
  slopeCILower: number; // per decade
  slopeCIUpper: number; // per decade
  slopeStdErrPerYear: number;
  olsPValue: number;
  olsTStat: number;
  mkS: number;
  mkZ: number;
  mkPValue: number;
  mkTau: number;
  senN: number;
  seasonalMk: { z: number; pValue: number; s: number; groups: number; basis: string } | null;
  primaryTest: "seasonal-mann-kendall" | "mann-kendall";
  primaryPValue: number;
  verdict: "increasing" | "decreasing" | "not-significant" | "insufficient";
  significant: boolean;
  warnings: string[];
  computedBy: string;
  trendLine: { year: number; fit: number }[]; // for charting (full domain)
}

export function analyzeSeries(
  pointsIn: CleanPoint[],
  opts: { alpha: number; resolution: "daily" | "monthly"; expectedSlots: number }
): AnalysisCore {
  const points = [...pointsIn].sort((a, b) => (a.t < b.t ? -1 : 1));
  const nObs = points.length;
  const nExpected = opts.expectedSlots;
  const nMissing = Math.max(0, nExpected - nObs);
  const coverage = nExpected > 0 ? nObs / nExpected : 1;
  const warnings: string[] = [];

  if (nObs < 20) {
    warnings.push(`Only ${nObs} valid observations — too few for a reliable trend assessment (minimum 20).`);
    const ols = olsRegress(points, opts.alpha);
    return {
      nObs, nExpected, coverage, nMissing,
      nOutliers: iqrOutliers(points),
      lag1Autocorr: null,
      slopePerYear: ols?.slope ?? 0,
      slopePerDecade: (ols?.slope ?? 0) * 10,
      senSlopePerYear: senSlope(points) ?? 0,
      senSlopePerDecade: (senSlope(points) ?? 0) * 10,
      intercept: ols?.intercept ?? 0,
      rSquared: ols?.rSquared ?? 0,
      slopeCILower: (ols?.ciLower ?? 0) * 10,
      slopeCIUpper: (ols?.ciUpper ?? 0) * 10,
      slopeStdErrPerYear: ols?.slopeStdErr ?? 0,
      olsPValue: ols?.pValue ?? 1,
      olsTStat: ols?.tStat ?? 0,
      mkS: 0, mkZ: 0, mkPValue: 1, mkTau: 0, senN: nObs,
      seasonalMk: null,
      primaryTest: "mann-kendall",
      primaryPValue: 1,
      verdict: "insufficient",
      significant: false,
      warnings,
      computedBy: "z9-earthscope-stats/1.0 (OLS · Theil–Sen · Mann–Kendall)",
      trendLine: buildTrendLine(points, ols),
    };
  }

  const ols = olsRegress(points, opts.alpha)!;
  const lag1 = lag1Autocorrelation(points, ols.slope, ols.intercept);
  const nOutliers = iqrOutliers(points);

  // Sen's slope & Mann–Kendall: use monthly aggregation for long daily runs
  const needsAggregation = nObs > 1500;
  const trendPoints = needsAggregation ? aggregateMonthly(points) : points;
  const sen = senSlope(trendPoints) ?? 0;
  const mk = mannKendall(trendPoints);
  const seasonal = seasonalMannKendall(points);

  // Primary test: seasonal MK when available & at least as conservative; else standard MK
  let primaryTest: AnalysisCore["primaryTest"] = "mann-kendall";
  let primaryPValue = mk?.pValue ?? 1;
  if (seasonal) {
    primaryTest = "seasonal-mann-kendall";
    // Deliberately use the seasonal result: it controls for the annual cycle,
    // which is the dominant confounder in environmental series.
    primaryPValue = seasonal.pValue;
  }

  const direction: "increasing" | "decreasing" = sen >= 0 ? "increasing" : "decreasing";
  const significant = primaryPValue <= opts.alpha;
  const verdict = significant ? direction : "not-significant";

  // ---------------- warnings (never silently ignored)
  if (coverage < 0.9) {
    warnings.push(`Observation coverage is ${(coverage * 100).toFixed(1)}% (${nMissing} missing slots). Trend estimates may be biased if gaps are systematic.`);
  }
  if (nObs < 30) {
    warnings.push("Fewer than 30 valid observations — statistical power is limited.");
  }
  if (lag1 !== null && Math.abs(lag1) > 0.4) {
    warnings.push(`Residual lag-1 autocorrelation is ${lag1.toFixed(2)} — observations are not independent, so p-values may overstate significance (consider trend-free pre-whitening).`);
  }
  if (seasonal && mk && (seasonal.pValue <= opts.alpha) !== (mk.pValue <= opts.alpha)) {
    warnings.push("Standard and seasonal Mann–Kendall tests disagree on significance — the seasonal test (which controls for the annual cycle) is reported as primary.");
  }
  if (nOutliers / nObs > 0.05) {
    warnings.push(`${nOutliers} observations fall outside 1.5×IQR fences (${((100 * nOutliers) / nObs).toFixed(1)}%). They were retained; inspect the series for extremes.`);
  }
  if (significant && Math.abs(sen * 10) > 0 && Math.abs(ols.slope * 10) / Math.abs(sen * 10) > 2.5) {
    warnings.push("OLS and Sen's slope differ substantially — the linear fit is sensitive to extremes; prefer Sen's slope for magnitude.");
  }

  return {
    nObs,
    nExpected,
    coverage,
    nMissing,
    nOutliers,
    lag1Autocorr: lag1,
    slopePerYear: ols.slope,
    slopePerDecade: ols.slope * 10,
    senSlopePerYear: sen,
    senSlopePerDecade: sen * 10,
    intercept: ols.intercept,
    rSquared: ols.rSquared,
    slopeCILower: ols.ciLower * 10,
    slopeCIUpper: ols.ciUpper * 10,
    slopeStdErrPerYear: ols.slopeStdErr,
    olsPValue: ols.pValue,
    olsTStat: ols.tStat,
    mkS: mk?.s ?? 0,
    mkZ: mk?.z ?? 0,
    mkPValue: mk?.pValue ?? 1,
    mkTau: mk?.tau ?? 0,
    senN: trendPoints.length,
    seasonalMk: seasonal
      ? { z: seasonal.z, pValue: seasonal.pValue, s: seasonal.s, groups: seasonal.groups, basis: `Calendar-month grouping (n=${seasonal.n}, ${seasonal.groups} seasons)` }
      : null,
    primaryTest,
    primaryPValue,
    verdict,
    significant,
    warnings,
    computedBy: "z9-earthscope-stats/1.0 (OLS · Theil–Sen · Mann–Kendall · Seasonal MK)",
    trendLine: buildTrendLine(points, ols),
  };
}

function buildTrendLine(
  points: CleanPoint[],
  ols: OLSResult | null
): { year: number; fit: number }[] {
  if (!points.length) return [];
  const slope = ols?.slope ?? 0;
  const intercept = ols?.intercept ?? 0;
  const x0 = points[0].year, x1 = points[points.length - 1].year;
  const N = 60;
  const out: { year: number; fit: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const year = x0 + ((x1 - x0) * i) / N;
    out.push({ year, fit: slope * year + intercept });
  }
  return out;
}
