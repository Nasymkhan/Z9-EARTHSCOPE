import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export interface StoredSeriesPoint {
  t: string; // ISO date label (YYYY-MM-DD for daily, YYYY-MM for monthly)
  year: number; // decimal year, used for regression
  v: number; // value in variable units (fill values removed)
}

export interface StoredAnalysisPayload {
  // --- descriptive ---
  variable: string;
  variableName: string;
  variableLong: string;
  unit: string;
  community: string;
  resolution: "daily" | "monthly";
  locationName: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  alpha: number;
  source: string; // e.g. "NASA POWER (MERRA-2 / CERES / GEOS)"
  requestedAt: string; // ISO
  // --- data quality ---
  nObs: number; // valid observations used
  nExpected: number; // calendar slots in range
  coverage: number; // 0..1
  nMissing: number;
  nOutliers: number; // IQR-fence count (diagnostic only)
  fillValue: number;
  lag1Autocorr: number | null; // lag-1 autocorrelation of regression residuals
  // --- inference ---
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
  senN: number; // n used for Sen/MK (after aggregation)
  seasonalMk: {
    z: number;
    pValue: number;
    s: number;
    groups: number;
    basis: string;
  } | null;
  primaryTest: "seasonal-mann-kendall" | "mann-kendall";
  primaryPValue: number;
  verdict: "increasing" | "decreasing" | "not-significant" | "insufficient";
  significant: boolean;
  warnings: string[];
  computedBy: string; // engine identifier
}

export const analyses = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  variable: text("variable").notNull(),
  locationName: text("location_name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  resolution: text("resolution").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  summary: jsonb("summary").$type<StoredAnalysisPayload>().notNull(),
  series: jsonb("series").$type<StoredSeriesPoint[]>().notNull(),
  seriesLength: integer("series_length").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
