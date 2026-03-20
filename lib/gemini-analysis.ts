import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildEnrichedCoachPrompt, type AnalysisPromptContext } from "@/lib/analysis-prompt";
import { parseAndNormalizeAnalysis } from "@/lib/analysis-result";
import type { ClaudeAnalysis } from "@/lib/types";

/** Models tried in order when `GEMINI_MODELS` is unset. Lite / 1.5 often still have free quota when 2.0-flash shows limit 0. */
const DEFAULT_MODEL_FALLBACKS = [
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
] as const;

const MAX_429_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isRateLimited(err: unknown): boolean {
  const m = errMsg(err);
  return (
    m.includes("429") ||
    m.includes("Too Many Requests") ||
    m.includes("RESOURCE_EXHAUSTED") ||
    m.includes("quota")
  );
}

function isModelUnavailable(err: unknown): boolean {
  const m = errMsg(err);
  return m.includes("404") || m.includes("NOT_FOUND") || m.includes("not found");
}

function retryDelayMs(err: unknown): number {
  const m = errMsg(err).match(/retry in ([\d.]+)\s*s/i);
  if (m) {
    const sec = Math.min(60, Math.max(2, parseFloat(m[1])));
    return Math.ceil(sec * 1000);
  }
  return 10_000;
}

function resolveModelIds(): string[] {
  const list = process.env.GEMINI_MODELS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list?.length) return list;
  const single = process.env.GEMINI_MODEL?.trim();
  if (single) return [single];
  return [...DEFAULT_MODEL_FALLBACKS];
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function generateJsonAnalysis(
  genAI: GoogleGenerativeAI,
  modelId: string,
  prompt: string
): Promise<ClaudeAnalysis> {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent(prompt);
  const rawText = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch {
    parsed = JSON.parse(extractJson(rawText));
  }
  return parseAndNormalizeAnalysis(parsed);
}

export async function analyzeTranscriptWithGemini(ctx: AnalysisPromptContext): Promise<ClaudeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildEnrichedCoachPrompt(ctx);
  const models = resolveModelIds();

  let lastError: unknown;

  for (const modelId of models) {
    for (let attempt = 0; attempt < MAX_429_RETRIES; attempt++) {
      try {
        return await generateJsonAnalysis(genAI, modelId, prompt);
      } catch (e) {
        lastError = e;
        if (isModelUnavailable(e)) {
          break;
        }
        if (isRateLimited(e) && attempt < MAX_429_RETRIES - 1) {
          await sleep(retryDelayMs(e));
          continue;
        }
        if (isRateLimited(e)) {
          break;
        }
        throw e;
      }
    }
  }

  const hint =
    "Tried models: " +
    models.join(", ") +
    ". Set GEMINI_MODELS to a model with quota (see https://ai.google.dev/gemini-api/docs/models ) or enable billing in Google AI Studio.";
  throw new Error(`${errMsg(lastError)}. ${hint}`);
}
