"use client";

import { useState, type FormEvent } from "react";
import { Bot, X, Send, LoaderCircle, Sparkles, Minimize2 } from "lucide-react";

type Message = { role: "user" | "model"; text: string };

const STARTERS = [
  "Explain how trend detection works",
  "Analyze temperature trends in Islamabad",
  "Find NASA POWER variables",
];

export default function EarthScopeAIWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Hello! I’m EarthScope AI. I can explain the science, search locations, retrieve recent NASA POWER observations, and run real trend analyses. What would you like to investigate?" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, text: clean }].slice(-12);
    setMessages(next);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/earthscope-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "EarthScope AI could not respond.");
      setMessages((current) => [...current, { role: "model" as const, text: data.answer ?? "" }].slice(-12));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      {open && (
        <section className="flex h-[min(620px,78vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-sky-300/20 bg-[#071426]/[.97] shadow-[0_24px_90px_rgba(0,0,0,.62)] backdrop-blur-2xl" aria-label="EarthScope AI assistant">
          <header className="flex items-center justify-between border-b border-white/10 bg-white/[.035] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-200"><Bot size={19}/></div>
              <div>
                <p className="text-sm font-semibold text-white">EarthScope AI</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/> Gemini · NASA data tools</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={17}/></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3.5" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={message.role === "user" ? "max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-sky-500/20 px-3.5 py-2.5 text-xs leading-relaxed text-sky-50" : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/[.08] bg-white/[.055] px-3.5 py-2.5 text-xs leading-relaxed text-slate-200"}>
                  {message.text}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400"><LoaderCircle size={14} className="animate-spin"/> Checking EarthScope data…</div>}
            {error && <p role="alert" className="rounded-lg border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100">{error}</p>}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
              {STARTERS.map((starter) => <button key={starter} type="button" onClick={() => void sendMessage(starter)} disabled={busy} className="rounded-full border border-sky-200/15 bg-sky-200/[.06] px-2.5 py-1.5 text-[10px] text-sky-100 transition hover:bg-sky-200/10 disabled:opacity-50">{starter}</button>)}
            </div>
          )}

          <form onSubmit={submit} className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/25 p-2 focus-within:border-sky-300/40">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(draft); } }} maxLength={2000} rows={2} placeholder="Ask about Earth data or request an analysis…" aria-label="Message EarthScope AI" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"/>
              <button type="submit" disabled={busy || draft.trim().length < 2} aria-label="Send message" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-400 text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15}/></button>
            </div>
            <p className="mt-2 text-center text-[9px] text-slate-500">AI can make mistakes. Verify scientific conclusions against source data.</p>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close EarthScope AI" : "Open EarthScope AI"} aria-expanded={open} className="group flex h-12 items-center gap-2.5 rounded-full border border-sky-200/30 bg-[#0b2440] px-4 text-white shadow-[0_8px_34px_rgba(0,0,0,.45),0_0_24px_rgba(56,153,225,.18)] transition hover:-translate-y-0.5 hover:border-sky-200/55 hover:bg-[#12365a]">
        {open ? <Minimize2 size={17}/> : <span className="relative grid h-7 w-7 place-items-center rounded-full bg-sky-300/15 text-sky-200"><Sparkles size={15}/><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#0b2440] bg-cyan-300"/></span>}
        <span className="text-xs font-semibold">{open ? "Minimize" : "Ask EarthScope AI"}</span>
      </button>
    </div>
  );
}
