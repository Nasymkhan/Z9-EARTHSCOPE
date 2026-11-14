"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircleQuestion, Send } from "lucide-react";

interface AnswerResponse {
  answer?: string;
  notice?: string;
  error?: string;
}

export default function EarthIntelligenceAsk({ analysisId }: { analysisId: string | null }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!analysisId) {
      setError("Save this analysis to the archive before asking a question.");
      return;
    }
    if (question.trim().length < 3) {
      setError("Enter a question with at least three characters.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setNotice("");
    try {
      const response = await fetch(`/api/analyses/${analysisId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await response.json() as AnswerResponse;
      if (!response.ok) throw new Error(data.error ?? `Question request failed (HTTP ${response.status}).`);
      setAnswer(data.answer ?? "");
      setNotice(data.notice ?? "");
    } catch (cause) {
      setError((cause as Error).message ?? "Could not answer this question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel overflow-hidden" aria-labelledby="earth-intelligence-title">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <p className="kicker">Optional AI integration</p>
        <h3 id="earth-intelligence-title" className="mt-1 flex items-center gap-2 font-display text-base font-semibold text-ice">
          <MessageCircleQuestion size={17} className="text-cyan" aria-hidden="true" /> Ask about this analysis
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-mist">Answers use the stored statistics and source metadata for this analysis only. Unsupported questions should be answered as insufficient evidence.</p>
      </div>
      <form onSubmit={ask} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <label className="min-w-0">
          <span className="label">Question</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="What does the slope estimate mean for this location?"
            className="field min-h-20 resize-y"
            aria-label="Question about this saved analysis"
          />
        </label>
        <button type="submit" className="btn btn-primary min-w-36" disabled={loading} aria-busy={loading}>
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}
          {loading ? "Checking" : "Ask question"}
        </button>
      </form>
      {error && <p className="mx-4 mb-4 rounded-md border border-amber/35 bg-amber/8 px-3 py-2 text-sm leading-relaxed text-amber sm:mx-5" role="status">{error}</p>}
      {answer && (
        <div className="border-t border-line px-4 py-4 sm:px-5" aria-live="polite">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ice">{answer}</p>
          {notice && <p className="mt-3 text-xs leading-relaxed text-faint">{notice}</p>}
        </div>
      )}
    </section>
  );
}
