import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Sigma, TriangleAlert } from "lucide-react";

const VALIDATION = [
  { name: "Increasing trend (+2.5 °C/decade, σ = 1.2)", sen: "+2.196", p: "< 0.0001", verdict: "increasing" },
  { name: "Decreasing trend (−2.5 °C/decade, σ = 1.2)", sen: "−2.435", p: "< 0.0001", verdict: "decreasing" },
  { name: "Flat series (noise only)", sen: "+0.099", p: "0.4505", verdict: "not significant" },
  { name: "Seasonal cycle + increase (+2.5 °C/decade)", sen: "+2.199", p: "< 0.0001 (seasonal MK)", verdict: "increasing" },
  { name: "Increasing, ~15% observations missing", sen: "+2.321", p: "< 0.0001", verdict: "increasing" },
  { name: "Flat series, high noise (σ = 6)", sen: "−0.074", p: "0.9046", verdict: "not significant" },
  { name: "Daily series, seasonal increase", sen: "+2.202", p: "< 0.0001 (seasonal MK)", verdict: "increasing" },
];

function Equation({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-md border border-line bg-deep px-4 py-3 font-mono text-[0.78rem] leading-relaxed text-[#C6D9EA]">{children}</div>;
}

export default function MethodologyReference() {
  return (
    <section id="methodology" className="scroll-mt-24 border-t border-line pt-10" aria-labelledby="methodology-title">
      <p className="kicker">Statistical protocol</p>
      <h2 id="methodology-title" className="mt-2 font-display text-3xl font-bold text-ice">How trends are detected</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-mist">
        Each analysis follows a documented, reproducible pipeline with explicit significance testing, seasonal control, missing-data accounting, and stated limitations.
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["01", "Request", "Validate variable, point, range, α, resolution"],
          ["02", "Ingest", "NASA POWER point API with timeout and retry handling"],
          ["03", "Clean", "Remove −999 fills, deduplicate, order, and count"],
          ["04", "Diagnose", "Coverage, outliers, and lag-1 autocorrelation"],
          ["05", "Estimate", "OLS, Theil–Sen, MK, and seasonal MK"],
          ["06", "Decide", "Apply α and report verdict with limitations"],
        ].map(([number, title, detail]) => (
          <div key={number} className="rounded-md border border-line bg-deep p-3">
            <span className="font-mono text-[0.55rem] text-cyan">{number}</span>
            <h3 className="mt-1 font-display text-sm font-semibold text-ice">{title}</h3>
            <p className="mt-1 text-[0.64rem] leading-snug text-faint">{detail}</p>
          </div>
        ))}
      </div>

      <div id="engine" className="mt-10 scroll-mt-24">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ice"><Sigma size={18} className="text-cyan" /> Estimators and tests</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="panel-flat space-y-3 p-4">
            <h4 className="font-display font-semibold text-ice">Ordinary least squares · descriptive fit</h4>
            <Equation>β₁ = Σ(tᵢ − t̄)(yᵢ − ȳ) ⁄ Σ(tᵢ − t̄)²<br />R² = 1 − SS_res ⁄ SS_tot<br />CI(β₁) = β₁ ± t_(1−α/2, n−2) · SE(β₁)</Equation>
            <p className="text-[0.78rem] leading-relaxed text-mist">OLS provides the familiar best-fit line, residual diagnostics, and confidence intervals. Its slope is reported transparently but is not the robust magnitude estimator.</p>
          </article>
          <article className="panel-flat space-y-3 p-4">
            <h4 className="font-display font-semibold text-ice">Theil–Sen · trend magnitude</h4>
            <Equation>β_Sen = median_(i&lt;j) {'{'} (yⱼ − yᵢ) ⁄ (tⱼ − tᵢ) {'}'}</Equation>
            <p className="text-[0.78rem] leading-relaxed text-mist">The median of pairwise slopes is resistant to extremes and is the reported trend magnitude, expressed per year and per decade.</p>
          </article>
          <article className="panel-flat space-y-3 p-4">
            <h4 className="font-display font-semibold text-ice">Mann–Kendall · monotonic significance</h4>
            <Equation>S = Σ_(i&lt;j) sgn(xⱼ − xᵢ)<br />Var(S) = [n(n−1)(2n+5) − Σₜ t(t−1)(2t+5)] ⁄ 18<br />Z = (S − sgn(S)) ⁄ √Var(S) · τ = S ⁄ (n(n−1)/2)</Equation>
            <p className="text-[0.78rem] leading-relaxed text-mist">This non-parametric test is robust to non-normal data. Tied values, including zero-precipitation days, receive tie correction.</p>
          </article>
          <article className="panel-flat space-y-3 p-4">
            <h4 className="font-display font-semibold text-ice">Seasonal Mann–Kendall · annual cycle</h4>
            <Equation>For each calendar month g: S = Σ_g S_g<br />Var(S) = Σ_g Var(S_g)<br />Z = (S − sgn(S)) ⁄ √Var(S) <span className="text-faint">(Hirsch &amp; Slack, 1984)</span></Equation>
            <p className="text-[0.78rem] leading-relaxed text-mist">Calendar-month grouping controls for annual cycles. When sufficient data exist, this is the primary significance result.</p>
          </article>
        </div>
        <p className="mt-3 text-[0.78rem] leading-relaxed text-mist">For daily series longer than 1,500 observations, Sen slope and Mann–Kendall use monthly means to keep pairwise calculations tractable. OLS, coverage, autocorrelation, and charts use the full native series.</p>
      </div>

      <div className="mt-10">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ice"><CheckCircle2 size={18} className="text-leaf" /> Engine validation</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist">Synthetic ground-truth cases are run against the production statistics engine and are also available at <code className="rounded bg-panel px-1.5 py-0.5 text-cyan">/api/dev/stats-selftest</code>.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="data-table min-w-[640px]">
            <thead><tr><th>Test case</th><th>Sen / decade</th><th>p-value</th><th>Expected verdict</th></tr></thead>
            <tbody>{VALIDATION.map((row) => <tr key={row.name}><td>{row.name}</td><td className="font-mono tabular-nums">{row.sen}</td><td className="font-mono tabular-nums">{row.p}</td><td className="capitalize">{row.verdict}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ice"><TriangleAlert size={18} className="text-amber" /> Assumptions and limitations</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ["Serial autocorrelation", "Mann–Kendall assumes independent observations. We measure residual lag-1 autocorrelation and warn beyond |0.40|."],
            ["Grid ≠ ground", "POWER represents an assimilated grid cell (~55 km), not a rooftop gauge or an entire country."],
            ["Model-assimilated data", "MERRA-2/CERES provide consistent coverage; in-situ stations remain ground truth."],
            ["Multiple tests", "Scanning many variables and locations raises false-positive risk. α is configurable at 0.01, 0.05, or 0.10."],
            ["Significance ≠ impact", "A precise small slope can be significant yet practically small; consider magnitude and p-value together."],
            ["No causal claims", "A detected trend does not prove its cause. Attribution requires a controlled study."],
            ["Missing values", "−999 fill values are removed, never interpolated. Low coverage and clustered gaps are disclosed."],
            ["Insufficient data", "Fewer than 20 valid observations produces no significance claim."],
          ].map(([title, detail]) => <article key={title} className="panel-flat p-4"><h4 className="font-display text-sm font-semibold text-amber">{title}</h4><p className="mt-1.5 text-[0.76rem] leading-relaxed text-mist">{detail}</p></article>)}
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-cyan/20 bg-cyan/[0.04] p-4">
        <h3 className="flex items-center gap-2 font-display font-semibold text-ice"><Database size={16} className="text-cyan" /> Data integrity commitments</h3>
        <ul className="mt-3 grid gap-2 text-[0.78rem] leading-relaxed text-mist md:grid-cols-2">
          <li>Live NASA POWER data are the default; synthetic output is explicitly labelled DEMO.</li>
          <li>No observation is fabricated, extrapolated, or interpolated to fill NASA gaps.</li>
          <li>Archived reports include an input and statistics checksum.</li>
          <li>The same inputs produce reproducible results, subject to upstream NASA updates.</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/explorer" className="btn btn-primary">Run an analysis <ArrowRight size={15} /></Link>
        <Link href="/data-sources" className="btn btn-ghost">Review data sources</Link>
      </div>
    </section>
  );
}