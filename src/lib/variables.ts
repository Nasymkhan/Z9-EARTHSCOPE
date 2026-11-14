// NASA POWER supported parameters (community = AG, verified against the live API).
// Reference: https://power.larc.nasa.gov/docs/methodology/parameters/

export type Resolution = "daily" | "monthly";

export interface PowerVariable {
  code: string;
  name: string;
  longName: string;
  unit: string;
  shortUnit: string;
  description: string;
  category: "Temperature" | "Hydrology" | "Atmosphere" | "Radiation";
  color: string; // chart / identity accent
  daily: boolean;
  monthly: boolean;
  availableFrom: number; // public API daily availability starts 1984-01-01
  notes: string;
}

export const POWER_COMMUNITY = "AG"; // Agronomy community — supports all listed parameters
export const POWER_FILL_VALUE = -999;
export const POWER_SOURCE = "NASA POWER (MERRA-2 / CERES / GEOS assimilation)";
export const POWER_AVAILABLE_FROM = "1984-01-01";

export const VARIABLES: PowerVariable[] = [
  {
    code: "T2M",
    name: "Air Temperature",
    longName: "Temperature at 2 Meters",
    unit: "°C",
    shortUnit: "°C",
    description: "Mean air temperature at 2 m above the surface.",
    category: "Temperature",
    color: "#3987D8",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "MERRA-2 assimilated reanalysis, bias-corrected for the surface.",
  },
  {
    code: "T2M_MAX",
    name: "Maximum Temperature",
    longName: "Temperature at 2 Meters Maximum",
    unit: "°C",
    shortUnit: "°C",
    description: "Daily maximum air temperature at 2 m above the surface.",
    category: "Temperature",
    color: "#DC5656",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "Monthly values are the mean of daily maxima.",
  },
  {
    code: "T2M_MIN",
    name: "Minimum Temperature",
    longName: "Temperature at 2 Meters Minimum",
    unit: "°C",
    shortUnit: "°C",
    description: "Daily minimum air temperature at 2 m above the surface.",
    category: "Temperature",
    color: "#0F9D9A",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "Monthly values are the mean of daily minima.",
  },
  {
    code: "PRECTOTCORR",
    name: "Precipitation",
    longName: "Precipitation Corrected Sum",
    unit: "mm/day",
    shortUnit: "mm/day",
    description: "Bias-corrected total precipitation (rain + snow water equivalent).",
    category: "Hydrology",
    color: "#2563EB",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "Corrected against GPCP observations; zeros are valid observations, not missing data.",
  },
  {
    code: "RH2M",
    name: "Relative Humidity",
    longName: "Relative Humidity at 2 Meters",
    unit: "%",
    shortUnit: "%",
    description: "Relative humidity of air at 2 m above the surface.",
    category: "Atmosphere",
    color: "#15966B",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "Computed from specific humidity and temperature at 2 m.",
  },
  {
    code: "WS2M",
    name: "Wind Speed",
    longName: "Wind Speed at 2 Meters",
    unit: "m/s",
    shortUnit: "m/s",
    description: "Wind speed at 2 m above the surface.",
    category: "Atmosphere",
    color: "#6B8EAE",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "Scalar wind speed, not vector components.",
  },
  {
    code: "ALLSKY_SFC_SW_DWN",
    name: "Solar Radiation",
    longName: "All Sky Surface Shortwave Downward Irradiance",
    unit: "MJ/m²/day",
    shortUnit: "MJ/m²/d",
    description: "All-sky shortwave irradiance reaching the surface — a proxy for insolation.",
    category: "Radiation",
    color: "#D69A32",
    daily: true,
    monthly: true,
    availableFrom: 1984,
    notes: "CERES / SRB-derived; includes cloud attenuation (all-sky).",
  },
];

export function getVariable(code: string): PowerVariable | undefined {
  return VARIABLES.find((v) => v.code === code);
}

export const CATEGORIES = ["Temperature", "Hydrology", "Atmosphere", "Radiation"] as const;

export const CITY_EXAMPLES = [
  { name: "Islamabad, Pakistan", latitude: 33.6844, longitude: 73.0479 },
  { name: "Karachi, Pakistan", latitude: 24.8607, longitude: 67.0011 },
  { name: "Lahore, Pakistan", latitude: 31.5204, longitude: 74.3587 },
  { name: "New Delhi, India", latitude: 28.6139, longitude: 77.209 },
];
