import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { loadAnalysis } from "@/lib/load-analysis";
import ResultsDashboard from "@/components/results-dashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const analysis = await loadAnalysis(id);
  if (!analysis) return { title: "Analysis not found" };
  return {
    title: `${analysis.payload.variableName} Trend — ${analysis.payload.locationName}`,
    description: `Z9 EarthScope analysis: ${analysis.payload.variable} at ${analysis.payload.locationName}, ${analysis.payload.startDate} → ${analysis.payload.endDate}. Verdict: ${analysis.payload.verdict}.`,
  };
}

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await loadAnalysis(id);
  if (!analysis) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/history" className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-mist hover:text-cyan">
          <ArrowLeft size={14} /> Investigation archive
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6rem] text-faint">Archived {new Date(analysis.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC · ID {analysis.id.slice(0, 8)}</span>
          <Link href={`/analysis/${analysis.id}/report`} target="_blank" className="btn btn-blue !py-2 !text-[0.68rem]"><FileText size={13} /> Download Report</Link>
        </div>
      </div>
      <ResultsDashboard result={analysis} />
    </div>
  );
}
