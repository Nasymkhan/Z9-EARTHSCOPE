"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, Rocket, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[z9-earthscope] unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-28 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/15 bg-rose-500/[0.06]">
        <CircleAlert size={28} className="text-rose-400" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-white">Instrument fault.</h1>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-slate-400">
        Something went wrong inside the platform. The fault has been logged. Your archived investigations are safe.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[0.62rem] text-slate-600">digest: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition-colors"
        >
          <RotateCcw size={14} /> Retry
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <Rocket size={14} /> Back home
        </Link>
      </div>
    </div>
  );
}
