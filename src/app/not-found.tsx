import Link from "next/link";
import { Telescope, Rocket, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-28 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <Telescope size={28} className="text-slate-400" />
      </div>
      <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-slate-600">
        404 — Signal Lost
      </div>
      <h1 className="mt-4 text-3xl font-bold text-white">Nothing at these coordinates.</h1>
      <p className="mt-3 max-w-sm text-[0.9rem] leading-relaxed text-slate-400">
        The page you requested drifted out of range. The Earth, however, is still right there — and it is changing. Go measure it.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft size={14} /> Go Home
        </Link>
        <Link
          href="/explorer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition-colors"
        >
          <Rocket size={14} /> Launch Explorer
        </Link>
      </div>
    </div>
  );
}
