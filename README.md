# Z9 EarthScope
### Discover What Is Changing on Our Planet.

**Z9 Space Labs · Islamabad, Pakistan — NASA Space Apps Challenge 2026 · “Be An Earth System Trend Detective!”**

Z9 EarthScope is an interactive Earth-observation investigation platform that turns **40+ years of real NASA Earth science data** into statistically defensible trend verdicts — for students, researchers, environmental analysts and curious citizens.

Every answer it gives is computed live from **NASA POWER** (MERRA-2 / CERES / GEOS assimilation), tested with **Theil–Sen robust slopes**, **Mann–Kendall** and **seasonal Mann–Kendall** statistics, and reported with honest coverage, autocorrelation and significance thresholds.

---

## The four questions it answers

| Question | Answer |
|---|---|
| **WHAT** is changing? | Variable-level detection across 7 NASA POWER parameters |
| **WHERE** is it changing? | Point-precise WGS-84 coordinates anywhere on Earth |
| **HOW MUCH** is it changing? | Sen’s slope in native units per decade + OLS fit + 95% CI |
| **IS IT SIGNIFICANT?** | Mann–Kendall / seasonal Mann–Kendall at α ∈ {0.01, 0.05, 0.10} |

---

## Feature matrix

- **Trend Explorer** — pick variable · location (search / map click / coordinates) · period · daily or monthly resolution · α threshold → *RUN EARTH ANALYSIS* → live server-side NASA fetch → statistics → verdict.
- **Scientific results dashboard** — indicator cards (observations, coverage, direction, significance), zoomable time-series chart with OLS trend line + period mean, full statistics ledger, assumption warnings, deterministic (optionally AI-assisted) plain-language interpretation.
- **Explore Earth console** (`/map`) — signature three-panel workspace: search/pin/click any coordinate on a **NASA Blue Marble (GIBS)** basemap, see the **latest NASA POWER observation** for your pin instantly, then apply a full seasonal Mann–Kendall verdict — without leaving the map. Fullscreen mode, reset view, layer control (GIBS / OSM / Esri / CARTO), live coordinate readout.
- **Interactive imagery** — real public-domain NASA photography throughout (Blue Marble, Black Marble, Apollo 17, Aurora, Earth’s limb), all credited; NASA GIBS WMTS basemaps (Blue Marble + MODIS Terra true color).
- **Location Compare** — same variable, same period, two locations: annual-mean overlay, Sen’s-slope gap, significance agreement, comparison ledger (Islamabad vs. Karachi out of the box).
- **Period comparison** — compare locations over a shared window or choose independent historical periods for each location.
- **Environmental relationships** — request two live NASA POWER variables at one location, align exact timestamps, and inspect Pearson and Spearman association with sample coverage. Association does not establish causation.
- **Seasonal anomaly diagnostics** — trend-adjusted, calendar-month median/MAD flags at a robust-z threshold; flags are diagnostic only and never disaster classifications.
- **Exports** — one-click CSV of every timestamped observation · checksummed, print-ready **scientific report** (Print → PDF) with methodology, limitations and NASA citation.
- **Z9 Earth Intelligence** — deterministic interpretations are always available; saved-analysis Q&A uses an optional configured AI provider and only the stored computed statistics.
- **Saved investigations** — every kept analysis archived in PostgreSQL with a permanent `/analysis/[id]` link.
- **Honest by construction** — `DEMO MODE` (explicit, synthetic, always labelled) when the live API is unreachable; never presents synthetic data as NASA.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Next.js 16 (App Router) · TypeScript strict · Tailwind 4   │
│                                                            │
│  Pages        /  /explorer  /map  /compare  /methodology   │
│               /data-sources  /about  /history  /analysis/…  │
│                                                            │
│  API routes                                                   │
│   POST /api/analyze ──► NASA POWER adapter (server-only)      │
│        │                  · timeout + retry + validation      │
│        ├──► stats engine (pure TS): OLS · Sen · MK · seasonal │
│        ├──► explanation engine (deterministic / optional LLM) │
│        └──► Drizzle ORM ──► PostgreSQL (analyses archive)     │
│   GET  /api/analyses[/id] · DELETE /api/analyses/[id]         │
│   POST /api/analyses/[id]/ask (optional AI provider)           │
│   POST /api/relationships (two live NASA POWER variables)      │
│   GET  /api/geocode (OSM Nominatim + offline gazetteer)       │
│   GET  /api/latest (newest daily observation for any pin)     │
│   GET  /api/dev/stats-selftest (synthetic engine QA)          │
│   GET  /api/health                                            │
└────────────────────────────────────────────────────────────┘
```

## Quick start

Requirements: **Node.js ≥ 20**, **PostgreSQL ≥ 14**.

```bash
npm install
cp .env.example .env          
npx drizzle-kit push        
npm run dev                   
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✔ | PostgreSQL connection string (analysis archive) |
| `AI_API_KEY` | optional | OpenAI-compatible key for an *optional* narrative layer |
| `AI_API_BASE_URL` | optional | defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | optional | e.g. `gpt-4o-mini` — only used if set with key |

> Without `AI_API_KEY` the interpretation panel is served by the built-in **deterministic** explanation engine, which is fully functional. Nothing is fabricated either way.

## Validation

```bash
npm run build && npm run start
curl localhost:3000/api/health
curl localhost:3000/api/dev/stats-selftest  
```

The engine is validated against deterministic synthetic datasets (increasing / decreasing / flat / seasonal / 15 % missing / high-noise / daily aggregation). See `/methodology` for the full protocol and results.

## Scientific methods (summary)

- **OLS** slope, intercept, R², SE, t-test and 95 % CI (Cornish–Fisher t-critical).
- **Theil–Sen** median pairwise slope — robust magnitude, per year and per decade.
- **Mann–Kendall** with tie correction and continuity correction; Kendall’s τ reported.
- **Seasonal Mann–Kendall** (Hirsch & Slack, 1984) — per calendar-month groups, reported as primary when applicable (controls the annual cycle).
- **Quality gates** — −999 fill removal (never interpolated), coverage %, IQR outlier count, lag-1 residual autocorrelation warning beyond |0.40|, minimum 20 valid observations, configurable α.
- **Aggregation rule** — daily series > 1,500 observations are Sen/MK-tested on monthly means; OLS and charts always use native data.

## NASA data & attribution

Z9 EarthScope is not affiliated with or endorsed by NASA. Data: **NASA Langley Research Center POWER Project** — https://power.larc.nasa.gov/ (retrieved per-analysis; access dates recorded in every report). Suggested citation: NASA/LARC POWER Project (2026), *POWER daily/monthly surface meteorology & flipped fluxes — point API*. Reanalysis inputs: **MERRA-2**; radiation: **CERES/SRB**.

## Judge’s 3-minute demo script

1. Open `/` — show the live NASA POWER preview strip (real Islamabad temperature since 2015).
2. Click **Launch Trend Explorer** → keep Islamabad, T2M, 2000→today, monthly → **RUN EARTH ANALYSIS**.
3. Walk the verdict strip: Sen’s slope, seasonal M–K p-value, α = 0.05 significance call.
4. Drag the chart brush; toggle α to 0.01 and re-run — watch the verdict gate, not the line, decide.
5. Open **Compare** → Islamabad vs Karachi → same variable, overlay + ledger.
6. Switch to **Explore Earth** → click anywhere in the Sahara → watch the latest observation load for your pin → **Apply Analysis**.
7. Download **CSV** and open the print-ready **Report** (Ctrl/Cmd+P → Save as PDF).
8. Show **Methodology** → scroll to the 7/7 synthetic validation table; open `/api/dev/stats-selftest`.

## Known limitations (by design, disclosed)

- POWER is a ~0.5° assimilated grid cell — a point is never "a country".
- Statistical significance ≠ causation; autocorrelation can flatter p-values (we warn).
- Vegetation index (MODIS NDVI) and GPM precipitation are roadmap items, not live features — see `/data-sources`.
- Monthly endpoint returns calendar years; Z9 clips client-side; `YYYY13` annual rows are excluded.
- Rate limits: 24 analyses / 10 min / IP (protects the free NASA service).

## Deployment

Any Node-compatible host with PostgreSQL (Vercel + Neon/Supabase, Railway, a VM). Set `DATABASE_URL`, run `npx drizzle-kit push`, `npm run build`, `npm run start`. Health check at `/api/health`. ISR: homepage revalidates hourly.

---

Built with real data and real statistics by **Z9 Space Labs** — Islamabad, Pakistan.
For the NASA Space Apps Challenge 2026. Z9 EarthScope is an independent open-source project; NASA retains all rights to its data under NASA’s open data policies.
