import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = clientIp(req);
  const limit = rateLimit(`analysis-ask:${ip}`, 8, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: `Question limit reached — try again in ${limit.retryAfterSec}s.` }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid analysis id." }, { status: 400 });

  let question: string;
  try {
    const body = await req.json() as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (question.length < 3 || question.length > 500) {
    return NextResponse.json({ error: "Question must contain 3 to 500 characters." }, { status: 400 });
  }

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json(
      { error: "AI question answering is not configured. The deterministic interpretation remains available." },
      { status: 503 }
    );
  }

  try {
    const rows = await getDb()
      .select({ summary: analyses.summary })
      .from(analyses)
      .where(eq(analyses.id, id))
      .limit(1);
    const analysis = rows[0]?.summary;
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });

    const facts = {
      variable: `${analysis.variableName} (${analysis.variable})`,
      unit: analysis.unit,
      location: `${analysis.locationName} (${analysis.latitude}, ${analysis.longitude})`,
      period: `${analysis.startDate} to ${analysis.endDate}`,
      resolution: analysis.resolution,
      source: analysis.source,
      validObservations: analysis.nObs,
      expectedObservations: analysis.nExpected,
      coverage: analysis.coverage,
      senSlopePerDecade: analysis.senSlopePerDecade,
      slopeCI95: [analysis.slopeCILower, analysis.slopeCIUpper],
      primaryTest: analysis.primaryTest,
      primaryPValue: analysis.primaryPValue,
      alpha: analysis.alpha,
      verdict: analysis.verdict,
      warnings: analysis.warnings,
    };
    const baseUrl = process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: "You are Z9 Earth Intelligence, a careful Earth-science assistant. Answer only from the provided stored analysis facts. Do not invent measurements, sources, dates, statistical tests, impacts, causes, or forecasts. Distinguish observed evidence from possible implications, state that correlation does not prove causation, and explicitly say when the evidence is insufficient. Keep the answer concise and plain text.",
          },
          { role: "user", content: `Analysis facts:\n${JSON.stringify(facts, null, 2)}\n\nQuestion:\n${question}` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return NextResponse.json({ error: `Configured AI provider returned HTTP ${response.status}.` }, { status: 502 });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: "The configured AI provider returned an empty answer." }, { status: 502 });

    return NextResponse.json({
      answer,
      mode: "ai-assisted",
      generatedAt: new Date().toISOString(),
      notice: "Generated from the stored analysis only. Verify important interpretations against the cited source data and methods.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[analysis-ask] request failed:", error);
    return NextResponse.json({ error: "Could not answer from this analysis. Try again later." }, { status: 502 });
  }
}
