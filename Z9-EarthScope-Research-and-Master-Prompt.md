# Z9 EarthScope — NASA Space Apps Project Research & Build Brief

Prepared: 6 November 2026
Team: Z9 Space Labs
Challenge: Be An Earth System Trend Detective!
Local event: Islamabad, Pakistan

## 1. Executive recommendation

Build **Z9 EarthScope**: an interactive Earth-system trend investigation website. It should let a user choose an environmental variable, time period, and geographic location; retrieve real NASA data; calculate and visualize trends; and explain whether the detected change is statistically significant.

This must be a working scientific tool, not a static dashboard or a collection of hard-coded charts.

Core user questions:
1. What is changing?
2. Where is it changing?
3. How much is it changing, and in which direction?
4. Is the trend statistically significant?
5. What dataset, units, period, and method support the conclusion?

Recommended hackathon strategy: deliver one complete, reproducible workflow using NASA POWER first, then add a second NASA Earth-observation source only if the core workflow is stable. Do not attempt to integrate every NASA dataset in the first build.

## 2. Official challenge interpretation

The official challenge is rated Advanced and concerns Earth Science and Software. Its brief asks for a tool that can select variables measured by Earth science missions or produced by Earth science models, visualize how those variables change over time, and determine what is changing, where, how much, and whether the change is scientifically significant.

Therefore, the solution must demonstrate:
- Variable discovery and selection.
- A time-series view with a user-selected period.
- Geographic context and comparison between places/regions.
- A quantitative trend estimate, not just a visual line.
- A defensible statistical significance assessment.
- Clear scientific explanation and data provenance.

Official challenge: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/

## 3. Product concept

Working product name: **Z9 EarthScope**
Tagline: **Discover what is changing on our planet.**
Positioning: An open, explainable Earth-science trend investigation platform powered by NASA data.

Primary user journey:
1. Open the website.
2. Choose a variable (for example, air temperature, precipitation, relative humidity, wind speed, or solar radiation).
3. Search for a place or select coordinates on a map.
4. Choose start and end dates and a temporal resolution.
5. Fetch real data from the source API.
6. Inspect the data and its quality.
7. Run trend analysis.
8. Review the chart, map, trend magnitude, confidence interval, p-value, and plain-language interpretation.
9. Compare another place or variable.
10. Export the result and its data/methodology.

## 4. NASA data strategy

### Phase 1 — NASA POWER (first working integration)

NASA POWER provides analysis-ready solar and meteorological time series through daily, hourly, and monthly/annual services. It is the recommended first integration because it is practical for a hackathon prototype and has documented API access.

Official documentation:
- API documentation: https://power.larc.nasa.gov/api/pages/
- Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Monthly/annual API: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- Parameter dictionary: https://power.larc.nasa.gov/parameters/
- API request tutorial: https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/

Useful starter parameter codes to verify in the official parameter dictionary before enabling:
- T2M — air temperature at 2 metres.
- T2M_MAX — maximum air temperature at 2 metres.
- T2M_MIN — minimum air temperature at 2 metres.
- PRECTOTCORR — corrected total precipitation.
- RH2M — relative humidity at 2 metres.
- WS2M — wind speed at 2 metres.
- ALLSKY_SFC_SW_DWN — all-sky surface shortwave downward radiation.

Example request shape (construct query parameters safely; do not hard-code a single location):
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=73.0551&latitude=33.6844&start=20150101&end=20251130&format=JSON

The coordinates above are an example for Islamabad only. The UI must use the user's chosen place/coordinates, not assume Islamabad for all users. Validate supported dates, units, missing-value sentinels, and response metadata. Never silently convert a missing-value sentinel such as -999 into a real measurement.

NASA POWER documentation states daily and monthly services provide time-series analysis-ready responses. Parameter availability depends on temporal level and user community; consult the parameter dictionary and API metadata rather than assuming every variable is available at every resolution.

### Phase 2 — NASA Earthdata / MODIS / GPM / MERRA-2

Add these only after the first end-to-end flow works:
- NASA Earthdata / CMR: discover collections and metadata. https://www.earthdata.nasa.gov/
- CMR Search API: https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html
- NASA Harmony: subsetting and transformation services for Earth-observation data. https://harmony.earthdata.nasa.gov/docs
- MODIS: land-surface temperature, vegetation indices, land cover and related satellite observations. https://modis.gsfc.nasa.gov/data/
- Global Precipitation Measurement (GPM): precipitation observations. https://gpm.nasa.gov/
- MERRA-2: atmospheric reanalysis. https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/

Important integration constraint: some Earthdata services and Harmony data transformations require an Earthdata Login. Never put passwords, access tokens, or secrets in browser code or a public repository. Use a secure backend and document authentication requirements. Do not claim that every NASA dataset is available anonymously.

## 5. Scientific methodology requirements

This is the most important technical differentiator. Do not label a trend “significant” just because a chart line slopes upward.

For every analysis, preserve and display:
- Source dataset and product/collection.
- Variable short name and full name.
- Units.
- Spatial coordinates/region and spatial aggregation method.
- Start/end dates and temporal resolution.
- Number of valid observations and missing observations.
- Processing and aggregation steps.
- Statistical method, assumptions, threshold, and limitations.

Recommended analysis pipeline:
1. Validate dates, coordinates, variable, and data response.
2. Parse timestamps and sort observations.
3. Convert documented missing-value sentinels to null/NaN.
4. Preserve gaps. Do not silently interpolate missing values.
5. Aggregate daily observations to monthly or annual values when appropriate; document the aggregation (mean, sum, minimum, maximum).
6. Inspect coverage and missingness; warn if the series is too short or too incomplete.
7. Calculate a linear regression slope as a familiar descriptive trend, with confidence interval and R-squared where appropriate.
8. Calculate a robust Sen's slope estimate.
9. Apply the Mann–Kendall trend test for monotonic trend detection, with a p-value and direction.
10. For seasonal monthly climate data, use a seasonal method or a clearly documented deseasonalization strategy. Do not apply a non-seasonal test blindly to strongly seasonal data.
11. Check serial autocorrelation. If present, use an appropriate correction/pre-whitening strategy or disclose that the ordinary test assumptions may not hold.
12. Use alpha = 0.05 as a clearly configurable default, not as a magical guarantee.
13. If testing many locations/pixels/variables simultaneously, address multiple comparisons (for example, false-discovery-rate adjustment) before presenting a map of significant areas.
14. Explain that statistical significance does not automatically mean practical importance or causation.

Output labels:
- Increasing / decreasing / no statistically significant monotonic trend detected.
- Sen's slope with units per year (or per decade) and correct time basis.
- Mann–Kendall p-value.
- Confidence interval where supported.
- Observation count and coverage.
- A plain-language interpretation with a caveat.

Use robust and tested scientific libraries in the backend, such as SciPy, statsmodels, and a validated Mann–Kendall implementation. Pin dependency versions and write unit tests against known synthetic datasets. Review the implementation's assumptions before presenting results as scientific conclusions.

Useful method references:
- NASA technical report on trend analysis techniques: https://ntrs.nasa.gov/citations/19910013502
- Mann–Kendall and Sen's slope tutorial (Google Earth Engine community tutorial; useful method explanation, not NASA documentation): https://developers.google.com/earth-engine/tutorials/community/nonparametric-trends
- NASA Giovanni user manual describes area-averaged time series, data gaps, and spatial averaging: https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html

## 6. Product requirements

### Must-have MVP
- Professional responsive website with a clear scientific identity.
- Landing page that explains the problem and the workflow.
- Analysis workspace with variable selector, date range, place/coordinate input, and temporal resolution.
- Real NASA POWER API integration.
- Loading, empty, validation, rate-limit, timeout, and API-error states.
- Data preview table with timestamps, values, units, and missing-data handling.
- Time-series chart with source observations and a trend line.
- Results panel: direction, slope, units/time basis, p-value, confidence interval if available, valid observation count, and significance label.
- Geographic map showing selected location(s) and comparison locations.
- Compare at least two locations for the same variable and period.
- Download CSV and analysis summary.
- Dataset/source citations visible in the UI and included in exports.
- About/methodology page explaining how calculations work and what they cannot prove.
- A demo dataset clearly labeled as sample/demo data when the live API is unavailable. Never pass sample data off as live NASA data.

### Strong differentiators (after MVP)
- Multi-variable comparison.
- Region/bounding-box analysis and spatial trend map.
- Additional NASA sources such as MODIS, GPM, or MERRA-2.
- Save/share an analysis URL or downloadable report.
- Explainable AI-generated summaries grounded only in computed results, with no invented claims.
- User-drawn region of interest.
- Multiple-testing correction for pixel-wise significance maps.

### Explicitly out of scope for the first build
- User accounts, billing, social feeds, chat, notifications.
- A general-purpose AI chatbot.
- Unsupported predictive climate forecasts.
- Huge global raster processing without a tested pipeline.
- Fake live charts or hard-coded NASA results.
- Claims of causation from correlation or trend alone.

## 7. Suggested technology architecture

Frontend:
- Next.js App Router + TypeScript.
- Tailwind CSS and a consistent component system.
- Recharts or another accessible charting library for time-series charts.
- Leaflet or MapLibre for the geographic map.
- Accessible controls, keyboard support, responsive layouts.

Backend:
- Python FastAPI service for NASA data retrieval and scientific analysis.
- pandas / NumPy for data preparation.
- SciPy / statsmodels and a validated Mann–Kendall implementation for statistical methods.
- Pydantic schemas for request and response validation.
- Server-side caching with clear cache timestamps and source attribution.

Architecture:
Browser UI → Next.js API/server layer → FastAPI scientific service → NASA POWER API
The backend should normalize data into a documented internal schema. Keep NASA credentials server-side if any later dataset requires authentication. Do not expose API secrets in frontend bundles.

If the team cannot support two services during the hackathon, implement a small Python FastAPI backend and a Next.js frontend with the simplest reliable deployment possible. A functioning, tested single data path is more valuable than an overengineered architecture.

## 8. Design direction

Visual identity:
- Product name: Z9 EarthScope.
- Style: premium scientific mission-control interface, not a generic admin dashboard.
- Colors: deep navy/near-black background, restrained cyan/teal highlights, Earth-data color ramps on maps, high-contrast typography.
- Use a clean grid, generous spacing, clear labels, and purposeful motion.
- The map and time-series chart are the visual centrepieces.
- Avoid excessive glassmorphism, neon, gradients, decorative cards, fake NASA insignia, or implying official NASA endorsement.
- Include a small “Independent student project — uses NASA open data” note.
- Make scientific values readable and units impossible to miss.
- Use color plus text/icon labels; do not communicate increasing/decreasing/significance through color alone.

Suggested pages:
1. Home — mission, explanation, sample investigation, CTA.
2. Trend Explorer — variable, location, date, chart, map, statistics.
3. Compare — two or more locations/variables.
4. Methodology & Data — sources, methods, caveats, citations.
5. About — Z9 Space Labs and project credits.

## 9. Quality, validation, and testing

Required automated tests:
- API parsing and response schema tests.
- Missing-value sentinel handling.
- Date ordering and duplicate timestamp handling.
- Unit/time-basis conversion tests.
- Synthetic increasing series should be detected as increasing.
- Synthetic decreasing series should be detected as decreasing.
- Flat/noisy series should not be falsely labelled significant.
- Seasonal series tests.
- Missing-data tests.
- Autocorrelation caveat/correction tests.
- API failure and cached/demo fallback tests.
- CSV export integrity tests.
- Frontend responsive and accessibility checks.

Acceptance criteria for the hackathon demo:
- A judge can select a variable and place, run an actual NASA data request, and see a returned time series.
- The source, unit, date range, and coordinates are visible.
- The chart is generated from returned data, not a hard-coded array.
- The trend result is computed by the backend and includes a method and p-value.
- The app warns about insufficient data, missing values, and statistical assumptions.
- A second location can be compared.
- The result can be exported.
- The demo works from a fresh browser session and has a clear fallback if NASA's API is temporarily unavailable.

## 10. Hackathon work plan

Before the event: research, wireframes, data/API experiments, test plan, roles, and architecture only. Follow the official event's rules about when hackathon development may begin.

During the event:
1. Confirm the challenge interpretation and one user story.
2. Test the NASA POWER endpoint with one variable and one location.
3. Build the backend data adapter and scientific calculation.
4. Build the analysis UI and connect it to real results.
5. Add comparison, map, exports, and methodology.
6. Test with known synthetic data and real NASA data.
7. Prepare a short live demo, project description, public repository, and citations.
8. Reserve time for final submission and presentation.

Suggested team ownership:
- Team lead/product: scope, user story, coordination, judging narrative.
- Data/API engineer: NASA data discovery, fetching, metadata, quality.
- Scientific analyst: time-series preparation, statistics, validation.
- Frontend engineer: dashboard, map, charts, responsive UI.
- Optional fifth/sixth members: QA, visual design, demo/storytelling, documentation.

## 11. Judging strategy

The published Space Apps judging criteria used across local event materials are:
- Impact — meaningful real-world/scientific benefit.
- Creativity — original approach and useful experience.
- Validity — scientific and technical soundness.
- Relevance — directly answers the selected challenge.
- Presentation — clear communication and demonstration.

Make the evidence visible:
- Impact: show a real environmental question and why a person would investigate it.
- Creativity: guided investigation, regional comparison, explainable results.
- Validity: real NASA source, units, statistical methods, assumptions, tests.
- Relevance: visibly answer what/where/how much/significance.
- Presentation: one memorable end-to-end live demo, simple language, readable visuals.

Do not optimize only for appearance. Scientific validity and challenge relevance must be demonstrable.

## 12. Submission preparation

The official 2026 event page says project submission opens on November 14 at 9:00 AM and closes November 15 at 11:59 PM local time. Verify the final project form and instructions on the official team Project tab.

Prepare:
- Project title and high-level summary.
- Publicly accessible final project/demo link as required by the live submission form.
- Public source-code repository if code is used.
- Short demo video or slide deck according to the live submission instructions.
- Detailed description of what was built and how it works.
- Explanation of NASA data and any AI use.
- Sources, licenses, dataset identifiers, and credits.
- Team member information.

2026 registration/submission timeline: https://www.spaceappschallenge.org/2026/
Official challenge: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/

Check the live submission form because requirements can change. Do not rely on old submission guides as the final authority.

---

# 13. COPY-PASTE MASTER BUILD PROMPT

You are a senior product engineer, geospatial data scientist, climate-data engineer, UX designer, and QA lead. Build a professional, functional web application called **Z9 EarthScope** for the 2026 NASA Space Apps Challenge challenge “Be An Earth System Trend Detective!”

MISSION
Create an interactive scientific investigation platform that uses real NASA Earth science data to help people determine what environmental variables are changing, where they are changing, how much they are changing, and whether the trends are statistically significant.

NON-NEGOTIABLE RULES
1. This must be a working application, not a static mockup.
2. Integrate the real NASA POWER API for the first complete data workflow.
3. Never invent NASA data, API responses, p-values, citations, dataset names, or scientific conclusions.
4. Clearly label any fallback/example data as DEMO DATA.
5. Show units, source, location, time range, valid sample count, method, and caveats.
6. Do not label a trend statistically significant unless the selected test actually supports that conclusion.
7. Never expose secrets, credentials, or private tokens in frontend code.
8. Do not use NASA logos or suggest that Z9 EarthScope is an official NASA product. State that it is an independent student project using NASA data.
9. Build in small, testable stages. Do not stop at a landing-page mockup.
10. Before changing an existing project, inspect its files and preserve working code. If no EarthScope project exists, create a new project directory rather than overwriting unrelated work.

TECH STACK
Use Next.js App Router, TypeScript, Tailwind CSS, a consistent accessible component library, Recharts for charts, and Leaflet or MapLibre for maps. Use Python FastAPI for data retrieval and scientific analysis, with pandas, NumPy, SciPy/statsmodels and a validated Mann–Kendall/Sen-slope implementation. If the environment cannot support this exact stack, explain the constraint and choose the simplest robust alternative without removing the scientific requirements.

DESIGN
Create a polished, premium Earth-observation mission-control experience:
- Deep navy background, restrained cyan/teal accents, clear high-contrast text.
- Large interactive map and time-series chart.
- Clean typography, spacious layout, consistent buttons and controls.
- Professional scientific dashboard, not a generic template.
- Responsive on laptop, tablet, and mobile.
- Accessible labels, keyboard controls, useful loading states, and clear empty/error states.
- Avoid fake NASA branding, excessive neon, decorative clutter, and meaningless animations.

PAGES
1. Home: explain the problem, show the workflow, introduce the platform, and provide a clear “Explore Trends” action.
2. Trend Explorer: select variable, location, date range, temporal resolution, and run an analysis.
3. Compare: compare at least two selected locations for the same variable and period.
4. Methodology & Data: document NASA sources, parameter definitions, units, statistical tests, assumptions, and limitations.
5. About: identify Z9 Space Labs and state that this is an independent student project.

CORE USER FLOW
- User chooses a variable from a searchable catalog.
- User searches for a place or enters latitude/longitude.
- User chooses start and end dates and daily/monthly resolution where supported.
- Application validates inputs and calls the NASA POWER API through the backend.
- Backend parses the response, converts missing-value sentinels to null, preserves gaps, and returns normalized observations plus metadata.
- UI displays source metadata and a preview of the observations.
- User runs analysis.
- Backend computes descriptive statistics, linear trend, robust Sen's slope, Mann–Kendall trend test, p-value, and confidence interval where methodologically supported.
- UI displays a time-series chart with a trend line, a map marker, a result summary, and methodological caveats.
- User adds a second location and compares trends.
- User downloads CSV and a concise analysis report with citations.

NASA POWER DATA INTEGRATION
Use the official NASA POWER API and documentation:
https://power.larc.nasa.gov/api/pages/
https://power.larc.nasa.gov/parameters/

Start with verified parameters such as T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, and ALLSKY_SFC_SW_DWN. Verify that each parameter is available for the chosen community and temporal resolution before enabling it in the UI.

Construct requests dynamically from validated user input. Do not hard-code Islamabad or a fixed date range. Use sensible defaults only as editable defaults. Handle HTTP errors, timeouts, rate limits, malformed responses, unavailable dates, and missing observations. Cache successful responses responsibly and show when data was retrieved.

SCIENTIFIC ANALYSIS
- Parse and sort time values; detect duplicates.
- Treat source missing-value sentinels as missing, not as valid measurements.
- Do not silently interpolate gaps.
- Aggregate to monthly/annual values only with a documented method.
- Compute ordinary least-squares trend as a descriptive measure.
- Compute Sen's slope and Mann–Kendall trend test using a validated implementation.
- Use a seasonal Mann–Kendall or documented deseasonalization strategy for strongly seasonal monthly observations.
- Check serial autocorrelation and warn or apply a documented correction where appropriate.
- Default significance threshold alpha = 0.05, visible to the user.
- If many locations or grid cells are tested, support false-discovery-rate correction before mapping significance.
- Distinguish statistical significance from practical importance and causation.
- If the series is too short or data coverage is poor, return “insufficient data” rather than a confident conclusion.

RESULTS PANEL
Show:
- Variable name and short code.
- Units.
- Data source and link.
- Selected coordinates/place.
- Date range and temporal resolution.
- Number of valid and missing observations.
- Trend direction.
- Sen's slope and units per year/decade.
- Mann–Kendall p-value.
- Significance threshold and conclusion.
- Confidence interval if supported.
- Methodology and caveat.
Use plain-language explanations, but never allow an AI-generated summary to change the computed statistical result.

MAP AND COMPARISON
Display the selected point(s) on a map. Let the user add a second or third point and compare the same variable and time window. Make the spatial scope clear: a point analysis is not a full-region or global raster analysis. Do not pretend a point value represents an entire country. Add true region/pixel analysis only when the chosen NASA dataset supports it and the spatial aggregation is implemented correctly.

EXPORTS
- CSV with timestamp, value, unit, and missing values represented correctly.
- JSON or downloadable report containing inputs, source, retrieval time, methodology, test results, and caveats.
- Include NASA source citations and parameter metadata in exports.

ENGINEERING
- Separate UI, API adapter, data normalization, statistical analysis, and visualization.
- Validate all inputs and backend responses with schemas.
- Add logging that excludes credentials.
- Add timeouts, retries with backoff where appropriate, and cache handling.
- Never put secrets in source control.
- Add README setup instructions, environment variable examples without real secrets, architecture notes, data attribution, and limitations.
- Pin dependencies.
- Write tests for increasing, decreasing, flat, seasonal, missing-data, duplicate-date, API-error, and export cases.
- Use synthetic data only for tests, never as if it were live NASA observations.

ACCEPTANCE TESTS
1. A fresh user can open the site and understand its purpose.
2. User can select a variable and coordinates.
3. App retrieves actual NASA POWER data.
4. The returned values are shown with units, timestamps, and source metadata.
5. A chart is generated from the returned values.
6. Trend statistics are computed by the backend.
7. The significance label matches the p-value and chosen method.
8. Missing or insufficient data produces a warning, not a fabricated result.
9. A second location can be compared.
10. CSV export works.
11. Methodology and data sources are visible.
12. The site is responsive and usable on a fresh browser session.
13. If the NASA API is unavailable, the app clearly offers a labelled demo mode without misrepresenting it as live data.

DELIVERY PROCESS
First inspect the project directory and current environment. Then produce a concise implementation plan and file tree. Build the real NASA POWER data request and scientific calculation before polishing decorative UI. Run tests, fix errors, and verify the complete user journey. At the end, provide:
- What works.
- What is incomplete.
- How to run locally.
- The public deployment steps.
- NASA datasets and exact parameters used.
- Statistical methods and caveats.
- Test results.
- A short 30-second demo script.

The final product must visibly and credibly answer the challenge's four questions: WHAT is changing, WHERE, HOW MUCH, and IS IT SIGNIFICANT?
